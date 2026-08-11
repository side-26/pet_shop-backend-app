import dotenv from 'dotenv';

import { ERROR_CODES, STATUES } from './constants.js';

dotenv.config({ quiet: true });

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
