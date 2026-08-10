import dotenv from 'dotenv';

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
