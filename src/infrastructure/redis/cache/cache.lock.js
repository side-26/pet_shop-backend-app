import { randomUUID } from 'node:crypto';

const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
end

return 0
`;

export class RedisCacheLock {
  #client;
  #namespace;

  constructor({ client, namespace = 'cache-lock' }) {
    this.#client = client;
    this.#namespace = namespace;
  }

  #buildKey(key) {
    return `${this.#namespace}:${key}`;
  }

  async acquire(key, { ttlMs = 5000 } = {}) {
    const lockKey = this.#buildKey(key);
    const token = randomUUID();

    const result = await this.#client.set(lockKey, token, {
      NX: true,
      PX: ttlMs,
    });

    if (result !== 'OK') {
      return null;
    }

    return {
      key: lockKey,
      token,
    };
  }

  async release(lock) {
    if (!lock) {
      return false;
    }

    const result = await this.#client.eval(RELEASE_LOCK_SCRIPT, {
      keys: [lock.key],
      arguments: [lock.token],
    });

    return result === 1;
  }
}
