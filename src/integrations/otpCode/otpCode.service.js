import { ERROR_CODES, STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { OtpCodeClient } from './otpCode.client.js';

const throwMappedProviderError = (error) => {
  if (error.code === ERROR_CODES.MELIPAYAMAK_OTP_TOKEN_NOT_CONFIGURED) {
    setErrorResponse(STATUES.INTERNAL_SERVER, {
      message: error?.message || 'سرویس ارسال پیامک به‌درستی پیکربندی نشده است',
      code: error.code,
    });
  }

  setErrorResponse(STATUES.OTHER_PROBLEM, {
    message: 'سرویس ارسال پیامک موقتاً در دسترس نیست',
    code: ERROR_CODES.MELIPAYAMAK_PROVIDER_UNAVAILABLE,
  });
};

export class OtpCodeService {
  static async send(destination) {
    try {
      const result = await OtpCodeClient.send(destination);

      if (
        !result ||
        typeof result !== 'object' ||
        Array.isArray(result) ||
        !['string', 'number'].includes(typeof result.code) ||
        (result.status !== undefined && typeof result.status !== 'string')
      ) {
        setErrorResponse(STATUES.OTHER_PROBLEM, {
          message: 'پاسخ سرویس ارسال پیامک معتبر نیست',
          code: ERROR_CODES.INVALID_MELIPAYAMAK_PROVIDER_RESPONSE,
        });
      }

      return {
        code: String(result.code),
        status: result.status ?? '',
      };
    } catch (error) {
      if (error.code === ERROR_CODES.INVALID_MELIPAYAMAK_PROVIDER_RESPONSE) {
        throw error;
      }
      throwMappedProviderError(error);
    }
  }
}
