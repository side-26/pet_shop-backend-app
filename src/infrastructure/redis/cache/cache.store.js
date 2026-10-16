export class RedisCacheStore {
  #client;
  #namespace;
  #defaultTtlSeconds;

  constructor({ client, namespace, defaultTtlSeconds = 300 }) {
    if (!client) {
      throw new TypeError('Redis client is required');
    }

    if (!namespace) {
      throw new TypeError('Cache namespace is required');
    }

    this.#client = client;
    this.#namespace = namespace;
    this.#defaultTtlSeconds = defaultTtlSeconds;
  }

  get namespace() {
    return this.#namespace;
  }

  buildKey(label) {
    if (!label) {
      throw new TypeError('Cache label is required');
    }

    return `${this.#namespace}:${label}`;
  }

  async get(label) {
    const key = this.buildKey(label);

    const rawValue = await this.#client.get(key);

    if (rawValue === null) {
      return null;
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      /*
       * Corrupted/incompatible cache data should never
       * break application reads.
       */
      await this.#client.del(key);

      return null;
    }
  }

  async set(label, value, { ttlSeconds = this.#defaultTtlSeconds } = {}) {
    const key = this.buildKey(label);

    const serializedValue = JSON.stringify(value);

    if (ttlSeconds === null) {
      await this.#client.set(key, serializedValue);

      return value;
    }

    await this.#client.set(key, serializedValue, {
      EX: ttlSeconds,
    });

    return value;
  }

  async delete(label) {
    return this.#client.del(this.buildKey(label));
  }

  async exists(label) {
    const exists = await this.#client.exists(this.buildKey(label));

    return exists === 1;
  }

  async ttl(label) {
    return this.#client.ttl(this.buildKey(label));
  }

  async expire(label, ttlSeconds) {
    return this.#client.expire(this.buildKey(label), ttlSeconds);
  }

  async deleteMany(labels) {
    if (!labels.length) {
      return 0;
    }

    const keys = labels.map((label) => this.buildKey(label));

    return this.#client.del(keys);
  }
}
