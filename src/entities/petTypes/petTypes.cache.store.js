import logger from '#configs/logger.js';

import RedisClient from '#infrastructure/redis/client.js';
import { RedisCacheStore } from '#infrastructure/redis/cache/cache.store.js';

const PET_TYPE_CACHE_NAMESPACE = 'pet-types';
const PET_TYPE_CACHE_TTL_SECONDS = 300;
const PET_TYPE_CACHE_LABELS = Object.freeze({
  ALL_ENABLED: 'all:enabled',
  ALL_WITH_DISABLED: 'all:with-disabled',
});

export class PetTypeCacheStore {
  #store;

  constructor({ client = RedisClient.getClient() } = {}) {
    this.#store = new RedisCacheStore({
      client,
      namespace: PET_TYPE_CACHE_NAMESPACE,
      defaultTtlSeconds: PET_TYPE_CACHE_TTL_SECONDS,
    });
  }

  static getAllLabel(includeDisabled) {
    return includeDisabled
      ? PET_TYPE_CACHE_LABELS.ALL_WITH_DISABLED
      : PET_TYPE_CACHE_LABELS.ALL_ENABLED;
  }

  static getByIdLabel(id) {
    return `id:${id}`;
  }

  static getBySlugLabel(slug) {
    return `slug:${slug}`;
  }

  async getOrLoad(label, loader) {
    try {
      const cachedValue = await this.#store.get(label);

      if (cachedValue !== null) {
        return cachedValue;
      }
    } catch (error) {
      logger.app.warn('بازیابی کش نوع حیوان از Redis ناموفق بود', error);
    }

    const value = await loader();

    if (value === null || value === undefined) {
      return value;
    }

    try {
      await this.#store.set(label, value);
    } catch (error) {
      logger.app.warn('ذخیره‌سازی کش نوع حیوان در Redis ناموفق بود', error);
    }

    return value;
  }

  async invalidate(petType) {
    const labels = [
      PET_TYPE_CACHE_LABELS.ALL_ENABLED,
      PET_TYPE_CACHE_LABELS.ALL_WITH_DISABLED,
    ];

    if (petType?._id) {
      labels.push(PetTypeCacheStore.getByIdLabel(petType._id));
    }

    if (petType?.slug) {
      labels.push(PetTypeCacheStore.getBySlugLabel(petType.slug));
    }

    try {
      await this.#store.deleteMany(labels);
    } catch (error) {
      /*
       * MongoDB is the source of truth. A cache cleanup
       * failure must not report a successfully persisted change
       * as failed, and every cache entry still has a bounded TTL.
       */
      logger.app.warn('پاک‌سازی کش نوع حیوان در Redis ناموفق بود', error);
    }
  }
}
