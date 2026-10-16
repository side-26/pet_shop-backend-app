import {
  DASHBOARD_METRICS,
  ORDER_DELIVERY_STATES,
  STATUES,
} from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { DashboardModel } from './dashboard.model.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const resolvePeriod = (
  {
    fromDate,
    toDate,
    groupBy = DASHBOARD_METRICS.GROUP_BY.DAY,
    lowStockThreshold = DASHBOARD_METRICS.DEFAULT_LOW_STOCK_THRESHOLD,
    topLimit = DASHBOARD_METRICS.DEFAULT_LIST_LIMIT,
    lowStockLimit = DASHBOARD_METRICS.DEFAULT_LIST_LIMIT,
    recentLimit = DASHBOARD_METRICS.DEFAULT_LIST_LIMIT,
  },
  now,
) => {
  const resolvedToDate = toDate || now;
  const resolvedFromDate =
    fromDate ||
    new Date(
      resolvedToDate.getTime() -
        DASHBOARD_METRICS.DEFAULT_PERIOD_DAYS * MILLISECONDS_PER_DAY,
    );

  return {
    fromDate: resolvedFromDate,
    toDate: resolvedToDate,
    groupBy,
    lowStockThreshold,
    topLimit,
    lowStockLimit,
    recentLimit,
  };
};

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export class DashboardService {
  static async getMetrics(query = {}, now = new Date()) {
    const options = resolvePeriod(query, now);

    try {
      const [orders, customers, products, pets] = await Promise.all([
        DashboardModel.aggregateOrders(options),
        DashboardModel.aggregateCustomers(options),
        DashboardModel.aggregateProducts({
          lowStockThreshold: options.lowStockThreshold,
          lowStockLimit: options.lowStockLimit,
        }),
        DashboardModel.aggregatePets({
          lowStockThreshold: options.lowStockThreshold,
          lowStockLimit: options.lowStockLimit,
        }),
      ]);

      const orderSummary = {
        orders: orders.summary.orders || 0,
        grossRevenue: orders.summary.grossRevenue || 0,
        discountTotal: orders.summary.discountTotal || 0,
        shippingRevenue: orders.summary.shippingRevenue || 0,
        netRevenue: orders.summary.netRevenue || 0,
        unitsSold: orders.summary.unitsSold || 0,
      };
      const lowStockItems = [...products.lowStockItems, ...pets.lowStockItems]
        .sort((left, right) =>
          left.quantity === right.quantity
            ? left.title.localeCompare(right.title)
            : left.quantity - right.quantity,
        )
        .slice(0, options.lowStockLimit);
      const deliveryStateCounts = new Map(
        orders.ordersByDeliveryState.map(({ deliveryState, count }) => [
          deliveryState,
          count,
        ]),
      );

      return {
        period: {
          fromDate: options.fromDate,
          toDate: options.toDate,
          groupBy: options.groupBy,
          timeZone: DASHBOARD_METRICS.TIME_ZONE,
        },
        summary: {
          ...orderSummary,
          averageOrderValue: orderSummary.orders
            ? roundMoney(orderSummary.netRevenue / orderSummary.orders)
            : 0,
          customers,
          catalog: {
            products: {
              total: products.total,
              enabled: products.enabled,
              lowStock: products.lowStock,
            },
            pets: {
              total: pets.total,
              enabled: pets.enabled,
              lowStock: pets.lowStock,
            },
          },
        },
        ordersByDeliveryState: ORDER_DELIVERY_STATES.map((deliveryState) => ({
          deliveryState,
          count: deliveryStateCounts.get(deliveryState) || 0,
        })),
        salesTrend: orders.salesTrend,
        topSellingItems: orders.topSellingItems,
        lowStockItems,
        recentOrders: orders.recentOrders,
      };
    } catch (error) {
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت آمار داشبورد ناموفق بود',
        error: String(error),
      });
    }
  }
}
