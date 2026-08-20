import RedisClient from '../client.js';

const CONSUME_SCRIPT = `
local current = redis.call('INCR', KEYS[1])

if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end

local ttl = redis.call('TTL', KEYS[1])
return { current, ttl }
`;

export class RedisRateLimitStore {
  #client;

  constructor() {
    this.#client = RedisClient.getClient();
  }

  async consume({ key, limit, window }) {
    const [currentValue, ttlValue] = await this.#client.eval(CONSUME_SCRIPT, {
      keys: [key],
      arguments: [String(window)],
    });
    const current = Number(currentValue);
    const ttl = Number(ttlValue);

    return {
      allowed: current <= limit,
      current,
      remaining: Math.max(limit - current, 0),
      limit,
      retryAfter: Math.max(ttl, 0),
    };
  }

  async reset(key) {
    await this.#client.del(key);
  }

  async get(key) {
    const [current, ttl] = await Promise.all([
      this.#client.get(key),
      this.#client.ttl(key),
    ]);

    return {
      current: Number(current ?? 0),
      ttl: Math.max(ttl, 0),
    };
  }
}
