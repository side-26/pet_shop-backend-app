import {
  CART_PAYMENT_TYPES,
  ERROR_CODES,
  ORDER_IDENTIFIER,
  ORDER_DELIVERY_STATE,
  SHIPPING,
  STATUES,
  USER_ITEM_TYPES,
} from '#configs/constants.js';
import { UserService } from '#entities/users/users.service.js';
import { ProductService } from '#entities/products/products.service.js';
import { getPaginationData, setErrorResponse } from '#utils/helpers.js';

import {
  generateNumericOrderIdentifier,
  snapshotOrderItem,
  snapshotUserAddress,
} from './orders.helpers.js';
import { OrderModel } from './orders.model.js';

export class OrderService {
  static getAuthenticatedUserId(actor) {
    const userId = actor?.userId || actor?.id;
    if (!userId) {
      setErrorResponse(STATUES.UN_AUTHORIZED, {
        message: 'هویت کاربر احراز نشده است',
      });
    }
    return userId;
  }

  static validateCart(cart) {
    if (!cart?.items?.length) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'سبد خرید خالی است',
        code: ERROR_CODES.ORDER_EMPTY_CART,
      });
    }
    const hasInvalidItem = cart.items.some(
      (entry) =>
        !entry.item ||
        (entry.itemType === USER_ITEM_TYPES.PRODUCT
          ? entry.item.isEnable !== true
          : entry.item.inEnable !== true) ||
        !Number.isInteger(entry.quantity) ||
        entry.quantity < 1 ||
        (entry.itemType === USER_ITEM_TYPES.PRODUCT &&
          (!entry.weight || !entry.item.weights?.id(entry.weight))),
    );
    if (
      hasInvalidItem ||
      !cart.userAddress ||
      !cart.deliveryWindow ||
      !cart.deliveryQuote ||
      cart.deliveryQuote.id === undefined ||
      cart.deliveryQuote.expiresAt <= new Date() ||
      cart.deliveryQuote.countryCode !== SHIPPING.COUNTRY_CODE ||
      cart.deliveryQuote.timezone !== SHIPPING.TIME_ZONE ||
      cart.deliveryQuote.addressId.toString() !== cart.userAddress.toString() ||
      !cart.deliveryQuote.options.some(
        ({ id }) => id === cart.deliveryWindow.id,
      ) ||
      cart.deliveryWindow.countryCode !== SHIPPING.COUNTRY_CODE ||
      cart.deliveryWindow.timezone !== SHIPPING.TIME_ZONE ||
      !cart.deliveringDateToShipping ||
      typeof cart.shippingPrice !== 'number' ||
      cart.shippingPrice !== cart.deliveryWindow.shippingPrice ||
      !Object.values(CART_PAYMENT_TYPES).includes(cart.paymentType)
    ) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'سبد خرید برای ثبت سفارش کامل یا معتبر نیست',
        code: ERROR_CODES.ORDER_INVALID_CART,
      });
    }
  }

  static async decrementProductInventory(cart, session) {
    for (const entry of cart.items) {
      if (entry.itemType === USER_ITEM_TYPES.PRODUCT) {
        await ProductService.decrementWeightStock(
          entry.item._id,
          entry.weight,
          entry.quantity,
          session,
        );
      }
    }
  }

  static findAddress(user, addressId) {
    if (typeof user.addresses?.id === 'function') {
      return user.addresses.id(addressId);
    }
    return user.addresses?.find(
      (address) => address._id.toString() === addressId.toString(),
    );
  }

  static buildOrderSnapshot(userId, cart, address, paymentTrackingId) {
    return {
      user: userId,
      paymentTrackingId,
      totalPrice: cart.totalPrice,
      items: cart.items.map(snapshotOrderItem),
      discountPrice: cart.discountPrice,
      userAddress: snapshotUserAddress(address),
      deliveryWindow:
        typeof cart.deliveryWindow.toObject === 'function'
          ? cart.deliveryWindow.toObject()
          : { ...cart.deliveryWindow },
      deliveringDateToShipping: cart.deliveringDateToShipping,
      shippingPrice: cart.shippingPrice,
      shippingInfo: {
        name: cart.shippingInfo?.name || '',
        trackingCode: cart.shippingInfo?.trackingCode || '',
        estimateDeliveryDate: cart.shippingInfo?.estimateDeliveryDate || null,
      },
      paymentType: cart.paymentType,
      instalmentCompany:
        cart.paymentType === CART_PAYMENT_TYPES.DIRECT
          ? null
          : cart.instalmentCompany,
    };
  }

  static async createWithUniqueIdentifiers(snapshot, session) {
    for (
      let attempt = 0;
      attempt < ORDER_IDENTIFIER.MAX_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      try {
        const orderData = {
          ...snapshot,
          orderNumber: generateNumericOrderIdentifier(),
          trackingCode: generateNumericOrderIdentifier(),
        };
        if (!session) return await OrderModel.create(orderData);

        const [order] = await OrderModel.create([orderData], { session });
        return order;
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }
    setErrorResponse(STATUES.OTHER_PROBLEM, {
      message: 'تولید شناسه یکتای سفارش ناموفق بود',
      code: ERROR_CODES.ORDER_IDENTIFIER_GENERATION_FAILED,
    });
  }

  static async createOrderFromCart(actor, paymentTrackingId) {
    const userId = this.getAuthenticatedUserId(actor);
    const session = await OrderModel.db.startSession();
    let transactionError;
    let order;
    try {
      await session.withTransaction(async () => {
        // The transaction callback is intentionally sequential: its read,
        // snapshot insert, and cart clear form one checkout boundary.
        const cart = await UserService.getCartItems(actor, session);
        const user = await UserService.findById(userId, true, session);
        this.validateCart(cart);
        await this.decrementProductInventory(cart, session);
        const address = this.findAddress(user, cart.userAddress);
        if (!address) {
          setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
            message: 'نشانی انتخاب‌شده برای سفارش معتبر نیست',
            code: ERROR_CODES.ORDER_INVALID_CART,
          });
        }

        order = await this.createWithUniqueIdentifiers(
          this.buildOrderSnapshot(userId, cart, address, paymentTrackingId),
          session,
        );
        await UserService.emptyCart(actor, session);
      });
    } catch (error) {
      transactionError = error;
    }

    try {
      await session.endSession();
    } catch (sessionError) {
      if (!transactionError) throw sessionError;
      if (!transactionError.cause) transactionError.cause = sessionError;
    }

    if (transactionError) throw transactionError;
    return order;
  }

  static async getUserOrder(actor, orderId) {
    const userId = this.getAuthenticatedUserId(actor);
    const order = await OrderModel.findOne({ _id: orderId, user: userId });
    if (!order) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'سفارش یافت نشد',
        code: ERROR_CODES.ORDER_NOT_FOUND,
      });
    }
    return order;
  }

  static async getUserOrders(actor, query = {}) {
    const userId = this.getAuthenticatedUserId(actor);
    return getPaginationData(OrderModel, { ...query, user: userId }, '', () =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت سفارش‌های کاربر ناموفق بود',
      }),
    );
  }

  static async getUserOrderSummary(actor) {
    const userId = this.getAuthenticatedUserId(actor);
    const userFilter = { user: userId };
    try {
      const [orders, delivered, latestOrder] = await Promise.all([
        OrderModel.countDocuments(userFilter),
        OrderModel.countDocuments({
          ...userFilter,
          deliveryState: ORDER_DELIVERY_STATE.DELIVERED,
        }),
        OrderModel.findOne(userFilter)
          .sort({ createdAt: -1 })
          .select('createdAt')
          .lean(),
      ]);

      return {
        orders,
        delivered,
        lastPurchase: latestOrder?.createdAt || null,
      };
    } catch (error) {
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت خلاصه سفارش‌های کاربر ناموفق بود',
        error: String(error),
      });
    }
  }

  static async getOrders(query = {}) {
    const result = await getPaginationData(OrderModel, { ...query }, '', () =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت فهرست سفارش‌ها ناموفق بود',
      }),
    );
    result.result = await OrderModel.populate(result.result, {
      path: 'user',
      select: 'firstName lastName phoneNumber email role',
    });
    return result;
  }

  static async updateOrderDeliveryState(orderId, deliveryState) {
    const order = await OrderModel.findByIdAndUpdate(
      orderId,
      { $set: { deliveryState } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!order) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'سفارش یافت نشد',
        code: ERROR_CODES.ORDER_NOT_FOUND,
      });
    }
    return order;
  }

  static async updateOrderShippingInfo(orderId, shippingInfo) {
    const update = Object.fromEntries(
      Object.entries(shippingInfo).map(([key, value]) => [
        `shippingInfo.${key}`,
        value,
      ]),
    );
    const order = await OrderModel.findByIdAndUpdate(
      orderId,
      { $set: update },
      { returnDocument: 'after', runValidators: true },
    );
    if (!order) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'سفارش یافت نشد',
        code: ERROR_CODES.ORDER_NOT_FOUND,
      });
    }
    return order;
  }
}
