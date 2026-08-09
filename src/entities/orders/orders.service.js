import {
  ERROR_CODES,
  ORDER_STATUSES,
  ROLES,
  STATUES,
} from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { ProductModel } from '#entities/products/products.model.js';

import {
  buildOrderItems,
  calculateOrderTotal,
  formatOrder,
} from './orders.helpers.js';
import { OrderModel } from './orders.model.js';

const releaseReservedStock = (reservedItems) =>
  Promise.all(
    reservedItems.map((item) =>
      ProductModel.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } },
      ),
    ),
  );

export class OrderService {
  static async findById(id, requester) {
    const order = await OrderModel.findById(id);
    if (!order) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'Order not found',
        code: ERROR_CODES.ORDER_NOT_FOUND,
      });
    }
    const requesterId = requester?.userId || requester?.id;
    if (
      requester?.role !== ROLES.ADMIN &&
      order.user.toString() !== requesterId?.toString()
    ) {
      setErrorResponse(STATUES.NO_ACCESS, {
        message: 'You cannot access this order',
        code: ERROR_CODES.ORDER_ACCESS_DENIED,
      });
    }
    return order;
  }

  static findAll({ user, status } = {}, requester = {}) {
    const query = {};
    if (requester.role === ROLES.ADMIN) {
      if (user) query.user = user;
    } else {
      query.user = requester.userId || requester.id;
    }
    if (status) query.status = status;
    return OrderModel.find(query).sort({ createdAt: -1 });
  }

  static async create(data, requester) {
    const productIds = [...new Set(data.items.map(({ product }) => product))];
    const products = await ProductModel.find({
      _id: { $in: productIds },
      isEnabled: true,
    });
    if (products.length !== productIds.length) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'One or more products are unavailable',
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }

    const productById = new Map(
      products.map((product) => [product._id.toString(), product]),
    );
    for (const item of data.items) {
      if (productById.get(item.product).stock < item.quantity) {
        setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
          message: 'Insufficient product stock',
          code: ERROR_CODES.INSUFFICIENT_PRODUCT_STOCK,
        });
      }
    }

    const reservedItems = [];
    for (const item of data.items) {
      const reservation = await ProductModel.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
      );
      if (reservation.modifiedCount !== 1) {
        await releaseReservedStock(reservedItems);
        setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
          message: 'Insufficient product stock',
          code: ERROR_CODES.INSUFFICIENT_PRODUCT_STOCK,
        });
      }
      reservedItems.push(item);
    }

    const items = buildOrderItems(data.items, products);
    try {
      return await OrderModel.create({
        user: requester.userId || requester.id,
        items,
        totalAmount: calculateOrderTotal(items),
        shippingAddress: data.shippingAddress,
        status: ORDER_STATUSES.PENDING,
      });
    } catch (error) {
      await releaseReservedStock(reservedItems);
      throw error;
    }
  }

  static async updateStatus(id, status, requester) {
    await this.findById(id, requester);
    const order = await OrderModel.findByIdAndUpdate(
      id,
      { $set: { status, updatedBy: requester.userId || requester.id } },
      { returnDocument: 'after', runValidators: true },
    );
    return order;
  }

  static async delete(id, requester) {
    await this.findById(id, requester);
    return OrderModel.findByIdAndDelete(id);
  }

  static format(order) {
    return formatOrder(order);
  }

  static formatMany(orders) {
    return orders.map(formatOrder);
  }
}
