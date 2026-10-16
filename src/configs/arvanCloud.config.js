// config/arvan.js

import { S3Client } from '@aws-sdk/client-s3';
import './env.config.js';

export const normalizeArvanEndpoint = (endpoint) => {
  const value = endpoint?.trim();
  if (!value) {
    throw new Error('نشانی سرویس ذخیره‌سازی آروان تنظیم نشده است');
  }

  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new TypeError('نشانی سرویس ذخیره‌سازی آروان معتبر نیست');
  }
};

export const arvanEndpoint = normalizeArvanEndpoint(process.env.ARVAN_ENDPOINT);

export const arvanS3 = new S3Client({
  region: 'ir-thr-at1', // use your bucket's actual region
  endpoint: arvanEndpoint,

  credentials: {
    accessKeyId: process.env.ARVAN_ACCESS_KEY,
    secretAccessKey: process.env.ARVAN_SECRET_KEY,
  },

  forcePathStyle: false,
});
