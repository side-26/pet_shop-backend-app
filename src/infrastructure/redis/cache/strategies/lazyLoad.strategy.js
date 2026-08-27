const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class LazyLoadStrategy {
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
    lockTtlMs = 5000,
    retryDelayMs = 50,
    retryAttempts = 5,
  }) {
    const cachedValue = await this.#store.get(key);

    if (cachedValue !== null) {
      return cachedValue;
    }

    const lockKey = `${this.#store.namespace}:${key}`;

    const lock = await this.#lock.acquire(lockKey, {
      ttlMs: lockTtlMs,
    });

    /*
     * Another process is loading the value.
     */
    if (!lock) {
      for (let attempt = 0; attempt < retryAttempts; attempt += 1) {
        await sleep(retryDelayMs);

        const value = await this.#store.get(key);

        if (value !== null) {
          return value;
        }
      }

      /*
       * Don't make Redis lock availability capable
       * of taking down the application.
       */
      return loader();
    }

    try {
      /*
       * Double-check after obtaining lock.
       *
       * Another process may have populated the cache
       * between our initial GET and lock acquisition.
       */
      const existingValue = await this.#store.get(key);

      if (existingValue !== null) {
        return existingValue;
      }

      const value = await loader();

      /*
       * Usually don't cache "not found".
       *
       * Negative caching can be added separately.
       */
      if (value !== null && value !== undefined) {
        await this.#store.set(key, value, {
          ttlSeconds,
        });
      }

      return value;
    } finally {
      await this.#lock.release(lock);
    }
  }
}
