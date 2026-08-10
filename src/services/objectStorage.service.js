import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

import { arvanS3 } from '#configs/arvanCloud.config.js';
import { OBJECT_STORAGE } from '#configs/constants.js';

const getBucket = () => {
  if (!process.env.ARVAN_BUCKET) {
    throw new Error('ARVAN_BUCKET is not configured');
  }

  return process.env.ARVAN_BUCKET;
};

const normalizeObjectKeyPart = (value, label) => {
  const normalized = value?.trim().replace(/^\/+|\/+$/g, '');

  if (!normalized || normalized.includes('..')) {
    throw new TypeError(`${label} is invalid`);
  }

  return normalized;
};

export class ObjectStorageService {
  static createObjectKey(directory, extension = 'webp') {
    const normalizedDirectory = normalizeObjectKeyPart(directory, 'Directory');
    const normalizedExtension = normalizeObjectKeyPart(extension, 'Extension')
      .replace(/^\./, '')
      .toLowerCase();

    if (normalizedExtension.includes('/')) {
      throw new TypeError('Extension is invalid');
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
    const normalizedKey = normalizeObjectKeyPart(key, 'Object key');

    if (!body || !contentType) {
      throw new TypeError('Object body and content type are required');
    }

    await arvanS3.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: normalizedKey,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    );

    return normalizedKey;
  }

  static async deleteObject(key) {
    const normalizedKey = normalizeObjectKeyPart(key, 'Object key');

    await arvanS3.send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: normalizedKey,
      }),
    );
  }

  static async deleteObjects(keys) {
    if (!Array.isArray(keys)) {
      throw new TypeError('Object keys must be an array');
    }

    if (keys.length === 0) return;

    const normalizedKeys = keys.map((key) =>
      normalizeObjectKeyPart(key, 'Object key'),
    );

    await arvanS3.send(
      new DeleteObjectsCommand({
        Bucket: getBucket(),
        Delete: {
          Objects: normalizedKeys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }

  static buildPublicUrl(key) {
    const normalizedKey = normalizeObjectKeyPart(key, 'Object key');
    const configuredBaseUrl = process.env.ARVAN_PUBLIC_BASE_URL;

    if (configuredBaseUrl) {
      return `${configuredBaseUrl.replace(/\/$/, '')}/${normalizedKey}`;
    }

    if (!process.env.ARVAN_ENDPOINT) {
      throw new Error(
        'ARVAN_PUBLIC_BASE_URL or ARVAN_ENDPOINT must be configured',
      );
    }

    const endpoint = new URL(process.env.ARVAN_ENDPOINT);
    endpoint.hostname = `${getBucket()}.${endpoint.hostname}`;
    endpoint.pathname = `/${normalizedKey}`;
    return endpoint.toString();
  }
}
