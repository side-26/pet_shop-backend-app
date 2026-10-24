import {
  ERROR_CODES,
  ORDER_PAYMENT_STATUSES,
  STATUES,
  USER_ITEM_TYPES,
} from '#configs/constants.js';
import { getMelipayamakSimpleSmsFrom } from '#configs/env.config.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { UserModel } from '#entities/users/users.model.js';
import { setErrorResponse } from '#utils/helpers.js';

import { SimpleSmsClient } from './simpleSms.client.js';
import { createPetPurchaseSmsText } from './simpleSms.helpers.js';
import {
  petPurchaseSmsSchema,
  simpleSmsBodySchema,
} from './simpleSms.schema.js';

const throwMappedProviderError = (error) => {
  if (
    [
      ERROR_CODES.MELIPAYAMAK_SIMPLE_SMS_TOKEN_NOT_CONFIGURED,
      ERROR_CODES.MELIPAYAMAK_SIMPLE_SMS_FROM_NOT_CONFIGURED,
    ].includes(error.code)
  ) {
    setErrorResponse(STATUES.INTERNAL_SERVER, {
      message: error.message || 'سرویس پیامک ساده به‌درستی پیکربندی نشده است',
      code: error.code,
    });
  }

  setErrorResponse(STATUES.OTHER_PROBLEM, {
    message: 'سرویس ارسال پیامک ساده موقتاً در دسترس نیست',
    code: ERROR_CODES.MELIPAYAMAK_PROVIDER_UNAVAILABLE,
  });
};

const DEFAULT_CUSTOMER_NAME = 'دوست';

export class PetPurchaseSmsService {
  static async sendForPaidOrder(orderId) {
    const order = await OrderModel.findById(orderId)
      .select('user items paymentStatus')
      .lean();
    const petNames = order?.items
      .filter((item) => item.itemType === USER_ITEM_TYPES.PET)
      .map((item) => item.title);

    if (
      !order ||
      order.paymentStatus !== ORDER_PAYMENT_STATUSES.PAID ||
      petNames?.length === 0
    ) {
      return null;
    }

    const user = await UserModel.findById(order.user)
      .select('firstName phoneNumber')
      .lean();
    if (!user) return null;

    return SimpleSmsService.send({
      name: user.firstName || DEFAULT_CUSTOMER_NAME,
      to: user.phoneNumber,
      petNames,
    });
  }
}

export class SimpleSmsService {
  static async send({ name, to, petNames }) {
    const notification = petPurchaseSmsSchema.parse({ name, to, petNames });
    const body = simpleSmsBodySchema.parse({
      from: getMelipayamakSimpleSmsFrom(),
      to: notification.to,
      text: createPetPurchaseSmsText(notification),
    });

    try {
      const result = await SimpleSmsClient.send(body);
      if (
        !result ||
        typeof result !== 'object' ||
        Array.isArray(result) ||
        !['string', 'number'].includes(typeof result.recId) ||
        (result.status !== undefined && typeof result.status !== 'string')
      ) {
        setErrorResponse(STATUES.OTHER_PROBLEM, {
          message: 'پاسخ سرویس پیامک ساده معتبر نیست',
          code: ERROR_CODES.INVALID_MELIPAYAMAK_PROVIDER_RESPONSE,
        });
      }
      if (result.status) {
        setErrorResponse(STATUES.OTHER_PROBLEM, {
          message: 'سرویس ارسال پیامک ساده درخواست را رد کرد',
          code: ERROR_CODES.MELIPAYAMAK_PROVIDER_REJECTED,
        });
      }

      return {
        recId: String(result.recId),
        status: result.status ?? '',
      };
    } catch (error) {
      if (
        [
          ERROR_CODES.INVALID_MELIPAYAMAK_PROVIDER_RESPONSE,
          ERROR_CODES.MELIPAYAMAK_PROVIDER_REJECTED,
        ].includes(error.code)
      ) {
        throw error;
      }
      throwMappedProviderError(error);
    }
  }
}
