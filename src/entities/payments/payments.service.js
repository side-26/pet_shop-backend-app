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
    const order = await OrderModel.findOne({ _id: orderId, user: userId })
      .select('user totalPrice discountPrice shippingPrice')
      .lean();
    if (!order) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'سفارش یافت نشد',
        code: ERROR_CODES.PAYMENT_ORDER_NOT_FOUND,
      });
    }

    const authority = crypto
      .randomBytes(PAYMENT_REQUEST.AUTHORITY_BYTES)
      .toString('hex');
    const payment = await PaymentModel.create({
      order: order._id,
      user: userId,
      amount: this.getOrderFinalPrice(order),
      authority,
      status: PAYMENT_STATUSES.PENDING,
      expiresAt: new Date(Date.now() + PAYMENT_REQUEST.EXPIRATION_MS),
    });
    const gatewayUrl = new URL(getPaymentGatewayUrl());
    gatewayUrl.searchParams.set('authority', authority);

    return {
      paymentId: payment.id || payment._id.toString(),
      authority,
      gatewayUrl: gatewayUrl.toString(),
    };
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

  static async markAsPaid(paymentId, { referenceId, paidAt }) {
    return PaymentModel.findOneAndUpdate(
      { _id: paymentId, status: PAYMENT_STATUSES.PENDING },
      {
        $set: {
          status: PAYMENT_STATUSES.PAID,
          gatewayReferenceId: referenceId,
          paidAt,
        },
      },
      { returnDocument: 'after', runValidators: true },
    );
  }

  static async payGatewayPayment(authority) {
    const payment = await PaymentModel.findOne({ authority })
      .select('_id status expiresAt')
      .lean();
    if (!payment) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'پرداخت یافت نشد',
        code: ERROR_CODES.PAYMENT_NOT_FOUND,
      });
    }
    if (payment.expiresAt <= new Date()) {
      setErrorResponse(STATUES.EXPIRED, {
        message: 'مهلت انجام پرداخت منقضی شده است',
        code: ERROR_CODES.PAYMENT_EXPIRED,
      });
    }
    if (payment.status !== PAYMENT_STATUSES.PENDING) {
      setErrorResponse(STATUES.CONFLICT, {
        message: 'این پرداخت قبلا پردازش شده است',
        code: ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
      });
    }
    const referenceId = crypto.randomUUID();
    const paidPayment = await this.markAsPaid(payment._id, {
      referenceId,
      paidAt: new Date(),
    });
    if (!paidPayment) {
      setErrorResponse(STATUES.CONFLICT, {
        message: 'این پرداخت قبلا پردازش شده است',
        code: ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
      });
    }
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
    await OrderModel.findByIdAndUpdate(
      payment.order,
      { $set: { paymentStatus: ORDER_PAYMENT_STATUSES.FAILED } },
      { runValidators: true },
    );
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
