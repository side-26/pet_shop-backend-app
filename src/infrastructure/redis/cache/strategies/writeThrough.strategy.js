// strategies/WriteThroughStrategy.js

export class WriteThroughStrategy {
  #store;

  constructor({ store }) {
    this.#store = store;
  }

  async execute({ key, writer, ttlSeconds }) {
    /*
     * DB FIRST.
     */
    const value = await writer();

    try {
      await this.#store.set(key, value, {
        ttlSeconds,
      });
    } catch {
      /*
       * Database operation already succeeded.
       *
       * Don't pretend the whole operation failed
       * just because cache synchronization failed.
       *
       * Remove potentially stale data instead.
       */
      try {
        await this.#store.delete(key);
      } catch {
        // Cache failure should not override DB success.
      }
    }

    return value;
  }
}
