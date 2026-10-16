jest.mock('../client.js', () => ({
  __esModule: true,
  default: {
    getClient: jest.fn(),
  },
}));

import RedisClient from '../client.js';
import { RedisRateLimitStore } from './redisRateLimit.store.js';

describe('Redis rate-limit store', () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = {
      del: jest.fn(),
      eval: jest.fn(),
      get: jest.fn(),
      ttl: jest.fn(),
    };
    RedisClient.getClient.mockReturnValue(client);
  });

  test('obtains the shared Redis client when constructed', () => {
    const store = new RedisRateLimitStore();

    expect(store).toBeInstanceOf(RedisRateLimitStore);
    expect(RedisClient.getClient).toHaveBeenCalledTimes(1);
  });

  test.each([
    {
      current: 1,
      expected: {
        allowed: true,
        current: 1,
        remaining: 2,
        limit: 3,
        retryAfter: 60,
      },
    },
    {
      current: 3,
      expected: {
        allowed: true,
        current: 3,
        remaining: 0,
        limit: 3,
        retryAfter: 40,
      },
    },
    {
      current: 4,
      expected: {
        allowed: false,
        current: 4,
        remaining: 0,
        limit: 3,
        retryAfter: 35,
      },
    },
  ])(
    'maps an atomic counter result for current count $current',
    async ({ current, expected }) => {
      const ttl = expected.retryAfter;
      client.eval.mockResolvedValue([current, ttl]);
      const store = new RedisRateLimitStore();

      await expect(
        store.consume({ key: 'rate-limit:auth:key', limit: 3, window: 60 }),
      ).resolves.toEqual(expected);
      expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
        keys: ['rate-limit:auth:key'],
        arguments: ['60'],
      });
    },
  );

  test('normalizes a negative Redis TTL without changing the counter', async () => {
    client.eval.mockResolvedValue([4, -1]);
    const store = new RedisRateLimitStore();

    await expect(
      store.consume({ key: 'rate-limit:auth:key', limit: 3, window: 60 }),
    ).resolves.toEqual({
      allowed: false,
      current: 4,
      remaining: 0,
      limit: 3,
      retryAfter: 0,
    });
  });

  test('propagates an atomic Redis consume failure', async () => {
    const redisError = new Error('eval failed');
    client.eval.mockRejectedValue(redisError);
    const store = new RedisRateLimitStore();

    await expect(
      store.consume({ key: 'rate-limit:auth:key', limit: 3, window: 60 }),
    ).rejects.toBe(redisError);
  });

  test('deletes the requested rate-limit key', async () => {
    client.del.mockResolvedValue(1);
    const store = new RedisRateLimitStore();

    await store.reset('rate-limit:auth:key');

    expect(client.del).toHaveBeenCalledWith('rate-limit:auth:key');
  });

  test.each([
    {
      redisCurrent: '2',
      redisTtl: 34,
      expected: { current: 2, ttl: 34 },
    },
    {
      redisCurrent: null,
      redisTtl: -2,
      expected: { current: 0, ttl: 0 },
    },
  ])(
    'returns normalized state for current value $redisCurrent',
    async ({ redisCurrent, redisTtl, expected }) => {
      client.get.mockResolvedValue(redisCurrent);
      client.ttl.mockResolvedValue(redisTtl);
      const store = new RedisRateLimitStore();

      await expect(store.get('rate-limit:auth:key')).resolves.toEqual(expected);
      expect(client.get).toHaveBeenCalledWith('rate-limit:auth:key');
      expect(client.ttl).toHaveBeenCalledWith('rate-limit:auth:key');
    },
  );

  test('propagates a Redis state inspection failure', async () => {
    const redisError = new Error('get failed');
    client.get.mockRejectedValue(redisError);
    client.ttl.mockResolvedValue(20);
    const store = new RedisRateLimitStore();

    await expect(store.get('rate-limit:auth:key')).rejects.toBe(redisError);
  });
});
