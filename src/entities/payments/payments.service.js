import crypto from 'crypto';

import {
  ERROR_CODES,
  PAYMENT_GATEWAY,
  PAYMENT_REQUEST,
  PAYMENT_STATUSES,
  ORDER_PAYMENT_STATUSES,
  STATUES,
} from '#configs/constants.js';
import {
  getFrontendAppUrl,
  getFrontendPaymentResultUrl,
  getPaymentGatewayUrl,
} from '#configs/env.config.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { OrderService } from '#entities/orders/orders.service.js';
import { getPaginationData, setErrorResponse } from '#utils/helpers.js';

import { PaymentModel } from './payments.model.js';

export class PaymentService {
  static getAuthenticatedUserId(actor) {
    const userId = actor?.userId || actor?.id;
    if (!userId) {
      setErrorResponse(STATUES.UN_AUTHORIZED, {
        message: 'هویت کاربر احراز نشده است',
      });
    }
    return userId;
  }

  static async createPayment(actor, data) {
    const userId = this.getAuthenticatedUserId(actor);
    const order = await OrderModel.findById(data.order)
      .select('user totalPrice')
      .lean();
    if (!order) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'سفارش یافت نشد',
        code: ERROR_CODES.PAYMENT_ORDER_NOT_FOUND,
      });
    }
    if (order.user.toString() !== userId.toString()) {
      setErrorResponse(STATUES.NO_ACCESS, {
        message: 'دسترسی به پرداخت این سفارش مجاز نیست',
        code: ERROR_CODES.PAYMENT_ORDER_ACCESS_DENIED,
      });
    }
    return PaymentModel.create({ ...data, user: userId });
  }

  static getOrderFinalPrice(order) {
    return order.totalPrice - order.discountPrice + order.shippingPrice;
  }

  static async requestPayment(actor, orderId) {
    const userId = this.getAuthenticatedUserId(actor);
    const order = await OrderModel.findOne({ _id: orderId, user: userId });
    if (!order) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'سفارش یافت نشد',
        code: ERROR_CODES.PAYMENT_ORDER_NOT_FOUND,
      });
    }
    if (order.paymentStatus !== ORDER_PAYMENT_STATUSES.PENDING) {
      setErrorResponse(STATUES.CONFLICT, {
        message: 'این سفارش در وضعیت قابل پرداخت نیست',
        code: ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
      });
    }
    if (!order.paymentExpiresAt || order.paymentExpiresAt <= new Date()) {
      await this.expirePreparedOrder(order._id);
      setErrorResponse(STATUES.EXPIRED, {
        message: 'مهلت پرداخت سفارش منقضی شده است',
        code: ERROR_CODES.PAYMENT_EXPIRED,
      });
    }
    const activePayment = await PaymentModel.findOne({
      order: order._id,
      status: PAYMENT_STATUSES.PENDING,
    });
    if (activePayment) {
      setErrorResponse(STATUES.CONFLICT, {
        message: 'برای این سفارش درخواست پرداخت فعال وجود دارد',
        code: ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
      });
    }

    const authority = crypto
      .randomBytes(PAYMENT_REQUEST.AUTHORITY_BYTES)
      .toString('hex');
    const payment = await PaymentModel.create({
      user: userId,
      order: order._id,
      amount: this.getOrderFinalPrice(order),
      authority,
      status: PAYMENT_STATUSES.PENDING,
      expiresAt: order.paymentExpiresAt,
    });
    const gatewayUrl = new URL(
      authority,
      `${getPaymentGatewayUrl().replace(/\/+$/, '')}/`,
    );

    return {
      paymentId: payment.id || payment._id.toString(),
      authority,
      gatewayUrl: gatewayUrl.toString(),
    };
  }

  static async expirePreparedOrder(orderId) {
    const session = await PaymentModel.db.startSession();
    let transactionError;
    try {
      await session.withTransaction(async () => {
        await PaymentModel.updateMany(
          { order: orderId, status: PAYMENT_STATUSES.PENDING },
          { $set: { status: PAYMENT_STATUSES.FAILED } },
          { session },
        );
        await OrderService.releasePreparedOrderReservation(orderId, session);
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
  }

  static async getUserPayment(actor, paymentId) {
    const userId = this.getAuthenticatedUserId(actor);
    const payment = await PaymentModel.findOne({
      _id: paymentId,
      user: userId,
    });
    if (!payment) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'پرداخت یافت نشد',
        code: ERROR_CODES.PAYMENT_NOT_FOUND,
      });
    }
    return payment;
  }

  static async getGatewayPayment(authority) {
    const payment = await PaymentModel.findOne({ authority })
      .select('status amount')
      .lean();
    if (!payment) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'پرداخت یافت نشد',
        code: ERROR_CODES.PAYMENT_NOT_FOUND,
      });
    }
    return {
      status: payment.status,
      finalPrice: payment.amount,
      companyName: PAYMENT_GATEWAY.COMPANY_NAME,
      appUrl: getFrontendAppUrl(),
    };
  }

  static async markAsPaid(
    paymentId,
    { referenceId, paidAt, orderId, session },
  ) {
    return PaymentModel.findOneAndUpdate(
      { _id: paymentId, status: PAYMENT_STATUSES.PENDING },
      {
        $set: {
          status: PAYMENT_STATUSES.PAID,
          gatewayReferenceId: referenceId,
          paidAt,
          order: orderId,
        },
      },
      {
        returnDocument: 'after',
        runValidators: true,
        ...(session && { session }),
      },
    );
  }

  static async payGatewayPayment(authority) {
    const payment = await PaymentModel.findOne({ authority })
      .select('_id order status expiresAt')
      .lean();
    if (!payment) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'پرداخت یافت نشد',
        code: ERROR_CODES.PAYMENT_NOT_FOUND,
      });
    }
    if (payment.expiresAt <= new Date()) {
      await this.expirePreparedOrder(payment.order);
      setErrorResponse(STATUES.EXPIRED, {
        message: 'مهلت انجام پرداخت منقضی شده است',
        code: ERROR_CODES.PAYMENT_EXPIRED,
      });
    }
    if (payment.status === PAYMENT_STATUSES.PAID) {
      return {
        success: true,
        callbackUrl: getFrontendPaymentResultUrl().replace(
          ':authority',
          encodeURIComponent(authority),
        ),
      };
    }
    if (payment.status !== PAYMENT_STATUSES.PENDING) {
      setErrorResponse(STATUES.CONFLICT, {
        message: 'این پرداخت قبلا پردازش شده است',
        code: ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
      });
    }
    const session = await PaymentModel.db.startSession();
    let transactionError;
    try {
      await session.withTransaction(async () => {
        const referenceId = crypto.randomUUID();
        const order = await OrderModel.findOneAndUpdate(
          {
            _id: payment.order,
            paymentStatus: ORDER_PAYMENT_STATUSES.PENDING,
            paymentExpiresAt: { $gt: new Date() },
          },
          {
            $set: {
              paymentStatus: ORDER_PAYMENT_STATUSES.PAID,
              paymentTrackingId: referenceId,
            },
          },
          { returnDocument: 'after', runValidators: true, session },
        );
        if (!order) {
          setErrorResponse(STATUES.CONFLICT, {
            message: 'این سفارش در وضعیت قابل پرداخت نیست',
            code: ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
          });
        }
        const paidPayment = await this.markAsPaid(payment._id, {
          referenceId,
          paidAt: new Date(),
          orderId: order._id,
          session,
        });
        if (!paidPayment) {
          setErrorResponse(STATUES.CONFLICT, {
            message: 'این پرداخت قبلا پردازش شده است',
            code: ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
          });
        }
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
    return {
      success: true,
      callbackUrl: getFrontendPaymentResultUrl().replace(
        ':authority',
        encodeURIComponent(authority),
      ),
    };
  }

  static async cancelGatewayPayment(authority) {
    const payment = await PaymentModel.findOne({ authority })
      .select('_id order status')
      .lean();
    if (!payment) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'پرداخت یافت نشد',
        code: ERROR_CODES.PAYMENT_NOT_FOUND,
      });
    }
    if (payment.status !== PAYMENT_STATUSES.PENDING) {
      setErrorResponse(STATUES.CONFLICT, {
        message: 'این پرداخت قبلا پردازش شده است',
        code: ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
      });
    }
    const cancelledPayment = await PaymentModel.findOneAndUpdate(
      { _id: payment._id, status: PAYMENT_STATUSES.PENDING },
      { $set: { status: PAYMENT_STATUSES.CANCELLED, paidAt: null } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!cancelledPayment) {
      setErrorResponse(STATUES.CONFLICT, {
        message: 'این پرداخت قبلا پردازش شده است',
        code: ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
      });
    }
    if (payment.order) await this.expirePreparedOrder(payment.order);
    setErrorResponse(STATUES.BAD_REQUEST, {
      message: 'پرداخت ناموفق بود و سفارش لغو شد',
    });
  }

  static async getUserPayments(actor, query = {}) {
    const userId = this.getAuthenticatedUserId(actor);
    return getPaginationData(PaymentModel, { ...query, user: userId }, '', () =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت فهرست پرداخت‌های کاربر ناموفق بود',
      }),
    );
  }

  static async getPayments(query = {}) {
    const result = await getPaginationData(PaymentModel, { ...query }, '', () =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت فهرست پرداخت‌ها ناموفق بود',
      }),
    );
    result.result = await PaymentModel.populate(result.result, {
      path: 'user',
      select: 'firstName lastName phoneNumber email role',
    });
    return result;
  }

  static async updatePaymentStatus(paymentId, data) {
    const update = { ...data };
    if (data.status === PAYMENT_STATUSES.PAID && !update.paidAt)
      update.paidAt = new Date();
    if (data.status !== PAYMENT_STATUSES.PAID) update.paidAt = null;
    const payment = await PaymentModel.findByIdAndUpdate(
      paymentId,
      { $set: update },
      { returnDocument: 'after', runValidators: true },
    );
    if (!payment) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'پرداخت یافت نشد',
        code: ERROR_CODES.PAYMENT_NOT_FOUND,
      });
    }
    return payment;
  }
}
