import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

import { arvanEndpoint, arvanS3 } from '#configs/arvanCloud.config.js';
import { OBJECT_STORAGE } from '#configs/constants.js';
import logger from '#configs/logger.js';

const createStorageError = (operation, cause) => {
  const statusCode = cause?.$metadata?.httpStatusCode;

  logger.app.error(`عملیات ${operation} در فضای ذخیره‌سازی ناموفق بود`, cause, {
    provider: 'arvan',
    statusCode,
    code: cause?.Code || cause?.code || cause?.name,
  });

  if (statusCode === 403) {
    // console.log(cause);
    return new Error(
      'دسترسی به فضای ذخیره‌سازی رد شد؛ نام باکت، کلیدهای دسترسی و مجوزها را بررسی کنید',
      { cause },
    );
  }

  if (statusCode === 404) {
    return new Error('باکت فضای ذخیره‌سازی پیدا نشد', { cause });
  }

  return new Error(`${operation} فایل در فضای ذخیره‌سازی ناموفق بود`, {
    cause,
  });
};

const getBucket = () => {
  if (!process.env.ARVAN_BUCKET) {
    throw new Error('متغیر محیطی ARVAN_BUCKET تنظیم نشده است');
  }

  return process.env.ARVAN_BUCKET;
};

const normalizeObjectKeyPart = (value, label) => {
  const normalized = value?.trim().replace(/^\/+|\/+$/g, '');

  if (!normalized || normalized.includes('..')) {
    throw new TypeError(`${label} معتبر نیست`);
  }

  return normalized;
};

const getPublicBaseUrl = () => {
  if (process.env.ARVAN_PUBLIC_BASE_URL) {
    return process.env.ARVAN_PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  const endpoint = new URL(arvanEndpoint);
  endpoint.hostname = `${getBucket()}.${endpoint.hostname}`;
  endpoint.pathname = '';
  return endpoint.toString().replace(/\/$/, '');
};

export class ObjectStorageService {
  static createObjectKey(directory, extension = 'webp') {
    const normalizedDirectory = normalizeObjectKeyPart(directory, 'پوشه');
    const normalizedExtension = normalizeObjectKeyPart(extension, 'پسوند')
      .replace(/^\./, '')
      .toLowerCase();

    if (normalizedExtension.includes('/')) {
      throw new TypeError('پسوند معتبر نیست');
    }

    return `${normalizedDirectory}/${nanoid(
      OBJECT_STORAGE.DEFAULT_ID_LENGTH,
    )}.${normalizedExtension}`;
  }

  static async uploadObject({
    key,
    body,
    contentType,
    cacheControl = OBJECT_STORAGE.DEFAULT_CACHE_CONTROL,
  }) {
    const normalizedKey = normalizeObjectKeyPart(key, 'کلید فایل');

    if (!body || !contentType) {
      throw new TypeError('محتوای فایل و نوع محتوای آن الزامی است');
    }

    const command = new PutObjectCommand({
      Bucket: getBucket(),
      Key: normalizedKey,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    });

    try {
      await arvanS3.send(command);
    } catch (cause) {
      throw createStorageError('بارگذاری', cause);
    }

    return normalizedKey;
  }

  static async deleteObject(key) {
    const normalizedKey = normalizeObjectKeyPart(key, 'کلید فایل');

    const command = new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: normalizedKey,
    });

    try {
      await arvanS3.send(command);
    } catch (cause) {
      throw createStorageError('حذف', cause);
    }
  }

  static async deleteObjects(keys) {
    if (!Array.isArray(keys)) {
      throw new TypeError('کلیدهای فایل باید به‌صورت آرایه ارسال شوند');
    }

    if (keys.length === 0) return;

    const normalizedKeys = keys.map((key) =>
      normalizeObjectKeyPart(key, 'کلید فایل'),
    );

    const command = new DeleteObjectsCommand({
      Bucket: getBucket(),
      Delete: {
        Objects: normalizedKeys.map((Key) => ({ Key })),
        Quiet: true,
      },
    });

    try {
      await arvanS3.send(command);
    } catch (cause) {
      throw createStorageError('حذف گروهی', cause);
    }
  }

  static buildPublicUrl(key) {
    const normalizedKey = normalizeObjectKeyPart(key, 'کلید فایل');
    return `${getPublicBaseUrl()}/${normalizedKey}`;
  }

  static getObjectKeyFromUrl(objectUrl) {
    let parsedUrl;
    let publicBaseUrl;

    try {
      parsedUrl = new URL(objectUrl);
      publicBaseUrl = new URL(`${getPublicBaseUrl()}/`);
    } catch {
      throw new TypeError('نشانی فایل ذخیره‌شده معتبر نیست');
    }

    if (
      parsedUrl.origin !== publicBaseUrl.origin ||
      !parsedUrl.pathname.startsWith(publicBaseUrl.pathname)
    ) {
      throw new TypeError('نشانی فایل متعلق به فضای ذخیره‌سازی نیست');
    }

    const key = decodeURIComponent(
      parsedUrl.pathname.slice(publicBaseUrl.pathname.length),
    );
    return normalizeObjectKeyPart(key, 'کلید فایل');
  }
}
