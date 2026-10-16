import logger from '#configs/logger.js';

export class RefreshAheadStrategy {
  #store;
  #lock;

  constructor({ store, lock }) {
    this.#store = store;
    this.#lock = lock;
  }

  async get({
    key,
    loader,
    ttlSeconds,
    refreshThresholdSeconds,
    lockTtlMs = 10_000,
  }) {
    const cachedValue = await this.#store.get(key);

    /*
     * First request / completely expired value.
     *
     * Behave similarly to lazy-loading.
     */
    if (cachedValue === null) {
      const value = await loader();

      if (value !== null && value !== undefined) {
        await this.#store.set(key, value, {
          ttlSeconds,
        });
      }

      return value;
    }

    const remainingTtl = await this.#store.ttl(key);

    if (remainingTtl > 0 && remainingTtl <= refreshThresholdSeconds) {
      /*
       * Don't await refresh.
       *
       * Existing cache remains immediately usable.
       */
      void this.#refresh({
        key,
        loader,
        ttlSeconds,
        lockTtlMs,
      });
    }

    return cachedValue;
  }

  async #refresh({ key, loader, ttlSeconds, lockTtlMs }) {
    const lockKey = `refresh:${this.#store.namespace}:${key}`;

    let lock;

    try {
      lock = await this.#lock.acquire(lockKey, {
        ttlMs: lockTtlMs,
      });

      if (!lock) {
        return;
      }

      const value = await loader();

      if (value !== null && value !== undefined) {
        await this.#store.set(key, value, {
          ttlSeconds,
        });
      }
    } catch (error) {
      /*
       * Log this through your application's logger.
       *
       * Never destroy the currently valid cached
       * value because refresh failed.
       */
      logger.error(`Refresh-ahead failed:${JSON.stringify(error)}`);
    } finally {
      if (lock) {
        await this.#lock.release(lock);
      }
    }
  }
}
