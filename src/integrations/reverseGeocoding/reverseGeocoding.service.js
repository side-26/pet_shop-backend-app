import { ERROR_CODES, NESHAN_API, STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { ReverseGeocodingClient } from './reverseGeocoding.client.js';

const throwMappedProviderError = (error) => {
  if (error.code === ERROR_CODES.NESHAN_API_KEY_NOT_CONFIGURED) {
    setErrorResponse(STATUES.INTERNAL_SERVER, {
      message: 'سرویس مکان‌یابی به‌درستی پیکربندی نشده است',
      code: error.code,
    });
  }

  if (NESHAN_API.INVALID_COORDINATE_STATUSES.includes(error.providerStatus)) {
    setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
      message: 'مختصات واردشده معتبر نیست',
      code: ERROR_CODES.NESHAN_INVALID_COORDINATES,
    });
  }

  if (NESHAN_API.CONFIGURATION_ERROR_STATUSES.includes(error.providerStatus)) {
    setErrorResponse(STATUES.OTHER_PROBLEM, {
      message: 'سرویس مکان‌یابی در دسترس نیست',
      code: ERROR_CODES.NESHAN_PROVIDER_CONFIGURATION_ERROR,
    });
  }

  if (NESHAN_API.LIMIT_ERROR_STATUSES.includes(error.providerStatus)) {
    setErrorResponse(STATUES.TOO_MANY_REQUESTS, {
      message: 'ظرفیت سرویس مکان‌یابی موقتاً تکمیل شده است',
      code: ERROR_CODES.NESHAN_PROVIDER_LIMIT_EXCEEDED,
    });
  }

  setErrorResponse(STATUES.OTHER_PROBLEM, {
    message: 'سرویس مکان‌یابی موقتاً در دسترس نیست',
    code: ERROR_CODES.NESHAN_PROVIDER_UNAVAILABLE,
  });
};

export class ReverseGeocodingService {
  static async reverseGeocode(coordinates) {
    try {
      const result = await ReverseGeocodingClient.reverseGeocode(coordinates);
      if (
        !result ||
        typeof result !== 'object' ||
        Array.isArray(result) ||
        typeof result.formatted_address !== 'string'
      ) {
        setErrorResponse(STATUES.OTHER_PROBLEM, {
          message: 'پاسخ سرویس مکان‌یابی معتبر نیست',
          code: ERROR_CODES.INVALID_NESHAN_PROVIDER_RESPONSE,
        });
      }

      return result;
    } catch (error) {
      if (error.code === ERROR_CODES.INVALID_NESHAN_PROVIDER_RESPONSE) {
        throw error;
      }
      throwMappedProviderError(error);
    }
  }
}
