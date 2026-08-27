export class CacheError extends Error {
  constructor(message, options = {}) {
    super(message, options);

    this.name = 'CacheError';
  }
}

export class CacheLockError extends CacheError {
  constructor(key) {
    super(`Could not acquire cache lock for "${key}"`);

    this.name = 'CacheLockError';
  }
}
