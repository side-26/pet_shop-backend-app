import express from 'express';
import request from 'supertest';

import RedisClient from '../client.js';
import { RateLimiter } from './rateLimit.core.js';

const TEST_KEY_PATTERN = 'rate-limit:*integration-test*';
const describeWithRedis = process.env.REDIS_TEST_URL ? describe : describe.skip;

const delay = (milliseconds) =>
  new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      resolve();
    }, milliseconds);
  });

const createTestApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  return app;
};

const addErrorHandler = (app) => {
  app.use((error, _req, res, _next) => {
    void _next;
    res.status(error.statusCode || 500).json({
      isSuccess: false,
      message: error.message,
    });
  });
};

const findKeys = async (client, pattern = TEST_KEY_PATTERN) => {
  const foundKeys = [];

  for await (const keys of client.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  })) {
    foundKeys.push(...(Array.isArray(keys) ? keys : [keys]));
  }

  return foundKeys;
};

const clearTestKeys = async (client) => {
  const keys = await findKeys(client);

  if (keys.length > 0) {
    await client.del(keys);
  }
};

const waitForKeyExpiry = async (client, key, timeoutMs = 2500) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if ((await client.exists(key)) === 0) {
      return;
    }

    await delay(50);
  }

  throw new Error('کلید آزمایشی Redis در زمان مورد انتظار منقضی نشد');
};

describeWithRedis('Redis rate-limit integration', () => {
  let client;
  let originalRedisUrl;

  beforeAll(async () => {
    originalRedisUrl = process.env.REDIS_URL;
    process.env.REDIS_URL = process.env.REDIS_TEST_URL;
    client = await RedisClient.connect();
    await clearTestKeys(client);
  });

  afterEach(async () => {
    await clearTestKeys(client);
  });

  afterAll(async () => {
    await clearTestKeys(client);
    await RedisClient.disconnect();

    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  });

  test('allows the limit boundary, blocks the next request, and stores an expiring counter', async () => {
    const app = createTestApp();
    const rateLimiter = new RateLimiter('integration-test-boundary');

    app.get(
      '/limited',
      rateLimiter.limit({ limit: 2, window: 10 }),
      (_req, res) => res.status(200).json({ isSuccess: true }),
    );
    addErrorHandler(app);

    const first = await request(app).get('/limited');
    const second = await request(app).get('/limited');
    const third = await request(app).get('/limited');
    const [key] = await findKeys(
      client,
      'rate-limit:integration-test-boundary:*',
    );

    expect(first.status).toBe(200);
    expect(first.headers['ratelimit-limit']).toBe('2');
    expect(first.headers['ratelimit-remaining']).toBe('1');
    expect(second.status).toBe(200);
    expect(second.headers['ratelimit-remaining']).toBe('0');
    expect(third.status).toBe(429);
    expect(third.headers['ratelimit-remaining']).toBe('0');
    expect(Number(third.headers['retry-after'])).toBeGreaterThan(0);
    expect(key).toContain('GET:/limited');
    expect(await client.get(key)).toBe('3');
    expect(await client.ttl(key)).toBeGreaterThan(0);
    expect(await client.ttl(key)).toBeLessThanOrEqual(10);
  });

  test('does not reset the fixed-window TTL for later requests', async () => {
    const app = createTestApp();
    const rateLimiter = new RateLimiter('integration-test-ttl');

    app.get('/ttl', rateLimiter.limit({ limit: 3, window: 5 }), (_req, res) =>
      res.sendStatus(200),
    );
    addErrorHandler(app);

    await request(app).get('/ttl');
    const [key] = await findKeys(client, 'rate-limit:integration-test-ttl:*');
    const firstTtl = await client.ttl(key);

    await delay(1100);
    await request(app).get('/ttl');

    const secondTtl = await client.ttl(key);

    expect(firstTtl).toBeGreaterThan(0);
    expect(secondTtl).toBeGreaterThan(0);
    expect(secondTtl).toBeLessThan(firstTtl);
  });

  test('allows requests again after the Redis window expires', async () => {
    const app = createTestApp();
    const rateLimiter = new RateLimiter('integration-test-expiry');

    app.get(
      '/expiry',
      rateLimiter.limit({ limit: 1, window: 1 }),
      (_req, res) => res.sendStatus(200),
    );
    addErrorHandler(app);

    expect((await request(app).get('/expiry')).status).toBe(200);
    expect((await request(app).get('/expiry')).status).toBe(429);

    const [key] = await findKeys(
      client,
      'rate-limit:integration-test-expiry:*',
    );
    await waitForKeyExpiry(client, key);

    expect((await request(app).get('/expiry')).status).toBe(200);
  });

  test('uses one bucket for query variations and dynamic route values', async () => {
    const app = createTestApp();
    const rateLimiter = new RateLimiter('integration-test-route-pattern');

    app.get(
      '/products/:id',
      rateLimiter.limit({ limit: 1, window: 10 }),
      (_req, res) => res.sendStatus(200),
    );
    addErrorHandler(app);

    const first = await request(app).get('/products/123?page=1');
    const second = await request(app).get('/products/456?page=50');

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(
      await findKeys(client, 'rate-limit:integration-test-route-pattern:*'),
    ).toHaveLength(1);
  });

  test('keeps routes, methods, namespaces, and requester IPs independent', async () => {
    const app = createTestApp();
    const sharedLimiter = new RateLimiter('integration-test-isolation');

    app.get(
      '/route-a',
      sharedLimiter.limit({ limit: 1, window: 10 }),
      (_req, res) => res.sendStatus(200),
    );
    app.get(
      '/route-b',
      sharedLimiter.limit({ limit: 1, window: 10 }),
      (_req, res) => res.sendStatus(200),
    );
    app.get(
      '/resource',
      sharedLimiter.limit({ limit: 1, window: 10 }),
      (_req, res) => res.sendStatus(200),
    );
    app.post(
      '/resource',
      sharedLimiter.limit({ limit: 1, window: 10 }),
      (_req, res) => res.sendStatus(200),
    );
    addErrorHandler(app);

    expect((await request(app).get('/route-a')).status).toBe(200);
    expect((await request(app).get('/route-a')).status).toBe(429);
    expect((await request(app).get('/route-b')).status).toBe(200);
    expect((await request(app).get('/resource')).status).toBe(200);
    expect((await request(app).post('/resource')).status).toBe(200);

    const ipApp = createTestApp();
    const ipLimiter = new RateLimiter('integration-test-ip');

    ipApp.get(
      '/resource',
      ipLimiter.limit({ limit: 1, window: 10 }),
      (_req, res) => res.sendStatus(200),
    );
    addErrorHandler(ipApp);

    expect(
      (
        await request(ipApp)
          .get('/resource')
          .set('X-Forwarded-For', '192.0.2.1')
      ).status,
    ).toBe(200);
    expect(
      (
        await request(ipApp)
          .get('/resource')
          .set('X-Forwarded-For', '192.0.2.1')
      ).status,
    ).toBe(429);
    expect(
      (
        await request(ipApp)
          .get('/resource')
          .set('X-Forwarded-For', '2001:db8::1')
      ).status,
    ).toBe(200);

    const namespaceAApp = createTestApp();
    const namespaceBApp = createTestApp();

    namespaceAApp.get(
      '/same',
      new RateLimiter('integration-test-namespace-a').limit({
        limit: 1,
        window: 10,
      }),
      (_req, res) => res.sendStatus(200),
    );
    namespaceBApp.get(
      '/same',
      new RateLimiter('integration-test-namespace-b').limit({
        limit: 1,
        window: 10,
      }),
      (_req, res) => res.sendStatus(200),
    );
    addErrorHandler(namespaceAApp);
    addErrorHandler(namespaceBApp);

    expect((await request(namespaceAApp).get('/same')).status).toBe(200);
    expect((await request(namespaceAApp).get('/same')).status).toBe(429);
    expect((await request(namespaceBApp).get('/same')).status).toBe(200);
  });

  test('atomically accepts no more than the configured concurrent limit', async () => {
    const app = createTestApp();
    const rateLimiter = new RateLimiter('integration-test-concurrency');

    app.get(
      '/concurrent',
      rateLimiter.limit({ limit: 5, window: 10 }),
      (_req, res) => res.sendStatus(200),
    );
    addErrorHandler(app);

    const responses = await Promise.all(
      Array.from({ length: 20 }, () => request(app).get('/concurrent')),
    );
    const allowedCount = responses.filter(
      ({ status }) => status === 200,
    ).length;
    const blockedCount = responses.filter(
      ({ status }) => status === 429,
    ).length;

    expect(allowedCount).toBe(5);
    expect(blockedCount).toBe(15);
  });
});
