import dotenv from 'dotenv';

import { ERROR_CODES, STATUES } from './constants.js';

dotenv.config({ quiet: true });

const getPositiveIntegerEnv = (name, fallback) => {
  const value = process.env[name]?.trim();
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(`مقدار ${name} باید یک عدد صحیح مثبت باشد`);
    error.statusCode = STATUES.INTERNAL_SERVER;
    error.code = `${name}_INVALID`;
    throw error;
  }
  return parsed;
};

export const getShippingDistanceRates = () => ({
  tehranPerKilometer: getPositiveIntegerEnv(
    'SHIPPING_TEHRAN_PER_KILOMETER_TOMAN',
    80000,
  ),
  otherCitiesPerKilometer: getPositiveIntegerEnv(
    'SHIPPING_OTHER_CITIES_PER_KILOMETER_TOMAN',
    120000,
  ),
});

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET_KEY?.trim();

  if (!secret) {
    const error = new Error('کلید امنیتی JWT در تنظیمات محیطی تعریف نشده است');
    error.statusCode = 500;
    error.code = 'JWT_SECRET_NOT_CONFIGURED';
    throw error;
  }

  return secret;
};

export const getJwtRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET_KEY?.trim();

  if (!secret) {
    const error = new Error(
      'کلید امنیتی توکن تازه‌سازی در تنظیمات محیطی تعریف نشده است',
    );
    error.statusCode = STATUES.INTERNAL_SERVER;
    error.code = 'JWT_REFRESH_SECRET_NOT_CONFIGURED';
    throw error;
  }

  return secret;
};

export const getTemporaryTokenSecret = () => {
  const secret = process.env.TEMPORARY_TOKEN_SECRET_KEY?.trim();
  if (!secret) {
    const error = new Error(
      'کلید امنیتی توکن موقت در تنظیمات محیطی تعریف نشده است',
    );
    error.statusCode = STATUES.INTERNAL_SERVER;
    error.code = ERROR_CODES.TEMPORARY_TOKEN_SECRET_NOT_CONFIGURED;
    throw error;
  }

  return secret;
};

export const getNeshanApiKey = () => {
  const apiKey = process.env.NESHAN_API_KEY?.trim();

  if (!apiKey) {
    const error = new Error('کلید سرویس نشان در تنظیمات محیطی تعریف نشده است');
    error.statusCode = STATUES.INTERNAL_SERVER;
    error.code = ERROR_CODES.NESHAN_API_KEY_NOT_CONFIGURED;
    throw error;
  }

  return apiKey;
};

export const getMelipayamakOtpToken = () => {
  const token = process.env.MELIPAYAMAK_OTP_TOKEN?.trim();

  if (!token) {
    const error = new Error('توکن سرویس پیامک در تنظیمات محیطی تعریف نشده است');
    error.statusCode = STATUES.INTERNAL_SERVER;
    error.code = ERROR_CODES.MELIPAYAMAK_OTP_TOKEN_NOT_CONFIGURED;
    throw error;
  }

  return token;
};
