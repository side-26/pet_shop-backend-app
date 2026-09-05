import {
  DASHBOARD_METRICS,
  ROLES,
  USER_ITEM_TYPES,
} from '#configs/constants.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { ProductModel } from '#entities/products/products.model.js';
import { UserModel } from '#entities/users/users.model.js';

const PERIOD_FORMATS = {
  [DASHBOARD_METRICS.GROUP_BY.DAY]: '%Y-%m-%d',
  [DASHBOARD_METRICS.GROUP_BY.WEEK]: '%G-W%V',
  [DASHBOARD_METRICS.GROUP_BY.MONTH]: '%Y-%m',
};

const orderNetRevenueExpression = {
  $add: [{ $subtract: ['$totalPrice', '$discountPrice'] }, '$shippingPrice'],
};

const orderUnitsExpression = {
  $reduce: {
    input: '$items',
    initialValue: 0,
    in: { $add: ['$$value', '$$this.quantity'] },
  },
};

const itemNetRevenueExpression = {
  $multiply: [
    '$items.price',
    '$items.quantity',
    {
      $subtract: [1, { $divide: ['$items.discountPercentage', 100] }],
    },
  ],
};

const metricValue = (facet) => facet?.[0]?.value || 0;

export class DashboardModel {
  static async aggregateOrders({
    fromDate,
    toDate,
    groupBy,
    topLimit,
    recentLimit,
  }) {
    const [metrics = {}] = await OrderModel.aggregate([
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                grossRevenue: { $sum: '$totalPrice' },
                discountTotal: { $sum: '$discountPrice' },
                shippingRevenue: { $sum: '$shippingPrice' },
                netRevenue: { $sum: orderNetRevenueExpression },
                unitsSold: { $sum: orderUnitsExpression },
              },
            },
            { $project: { _id: 0 } },
          ],
          ordersByDeliveryState: [
            { $group: { _id: '$deliveryState', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, deliveryState: '$_id', count: 1 } },
          ],
          salesTrend: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    date: '$createdAt',
                    format: PERIOD_FORMATS[groupBy],
                    timezone: DASHBOARD_METRICS.TIME_ZONE,
                  },
                },
                orders: { $sum: 1 },
                revenue: { $sum: orderNetRevenueExpression },
                unitsSold: { $sum: orderUnitsExpression },
              },
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                _id: 0,
                period: '$_id',
                orders: 1,
                revenue: { $round: ['$revenue', 2] },
                unitsSold: 1,
              },
            },
          ],
          topSellingItems: [
            { $unwind: '$items' },
            {
              $group: {
                _id: { itemId: '$items.item', itemType: '$items.itemType' },
                title: { $first: '$items.title' },
                mainImage: { $first: '$items.mainImage' },
                unitsSold: { $sum: '$items.quantity' },
                revenue: { $sum: itemNetRevenueExpression },
              },
            },
            { $sort: { unitsSold: -1, revenue: -1, title: 1 } },
            { $limit: topLimit },
            {
              $project: {
                _id: 0,
                itemId: '$_id.itemId',
                itemType: '$_id.itemType',
                title: 1,
                mainImage: 1,
                unitsSold: 1,
                revenue: { $round: ['$revenue', 2] },
              },
            },
          ],
          recentOrders: [
            { $sort: { createdAt: -1 } },
            { $limit: recentLimit },
            {
              $lookup: {
                from: UserModel.collection.name,
                localField: 'user',
                foreignField: '_id',
                as: 'user',
              },
            },
            { $set: { user: { $arrayElemAt: ['$user', 0] } } },
            {
              $project: {
                _id: 1,
                orderNumber: 1,
                deliveryState: 1,
                totalPrice: 1,
                discountPrice: 1,
                shippingPrice: 1,
                createdAt: 1,
                'user._id': 1,
                'user.firstName': 1,
                'user.lastName': 1,
                'user.phoneNumber': 1,
              },
            },
          ],
        },
      },
    ]);

    return {
      summary: metrics.summary?.[0] || {},
      ordersByDeliveryState: metrics.ordersByDeliveryState || [],
      salesTrend: metrics.salesTrend || [],
      topSellingItems: metrics.topSellingItems || [],
      recentOrders: metrics.recentOrders || [],
    };
  }

  static async aggregateCustomers({ fromDate, toDate }) {
    const [metrics = {}] = await UserModel.aggregate([
      { $match: { role: ROLES.CUSTOMER } },
      {
        $facet: {
          total: [{ $count: 'value' }],
          newInPeriod: [
            { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
            { $count: 'value' },
          ],
        },
      },
    ]);

    return {
      total: metricValue(metrics.total),
      newInPeriod: metricValue(metrics.newInPeriod),
    };
  }

  static async aggregateCatalog(
    Model,
    { enableField, itemType, lowStockThreshold, lowStockLimit },
  ) {
    const [metrics = {}] = await Model.aggregate([
      {
        $facet: {
          total: [{ $count: 'value' }],
          enabled: [{ $match: { [enableField]: true } }, { $count: 'value' }],
          lowStock: [
            { $match: { quantity: { $lte: lowStockThreshold } } },
            { $count: 'value' },
          ],
          lowStockItems: [
            { $match: { quantity: { $lte: lowStockThreshold } } },
            { $sort: { quantity: 1, title: 1 } },
            { $limit: lowStockLimit },
            {
              $project: {
                _id: 0,
                itemId: '$_id',
                itemType: { $literal: itemType },
                title: 1,
                mainImage: 1,
                quantity: 1,
              },
            },
          ],
        },
      },
    ]);

    return {
      total: metricValue(metrics.total),
      enabled: metricValue(metrics.enabled),
      lowStock: metricValue(metrics.lowStock),
      lowStockItems: metrics.lowStockItems || [],
    };
  }

  static aggregateProducts(options) {
    return this.aggregateCatalog(ProductModel, {
      ...options,
      enableField: 'isEnable',
      itemType: USER_ITEM_TYPES.PRODUCT,
    });
  }

  static aggregatePets(options) {
    return this.aggregateCatalog(PetModel, {
      ...options,
      enableField: 'inEnable',
      itemType: USER_ITEM_TYPES.PET,
    });
  }
}
