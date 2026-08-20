const mockConsume = jest.fn();

jest.mock('./redisRateLimit.store.js', () => ({
  RedisRateLimitStore: jest.fn().mockImplementation(() => ({
    consume: mockConsume,
  })),
}));

import { STATUES } from '#configs/constants.js';

import { RateLimiter } from './rateLimit.core.js';

const createRequest = (overrides = {}) => ({
  method: 'POST',
  baseUrl: '/api/auth',
  route: { path: '/send-otp' },
  ip: '192.168.1.10',
  ...overrides,
});

const createResponse = () => ({
  setHeader: jest.fn(),
});

describe('Redis rate-limit middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([undefined, null, '', '   ', 123])(
    'rejects invalid namespace value %p',
    (namespace) => {
      expect(() => new RateLimiter(namespace)).toThrow(
        'نام محدوده محدودکننده درخواست الزامی است',
      );
    },
  );

  test('returns an Express middleware function', () => {
    const rateLimiter = new RateLimiter('auth');

    expect(rateLimiter.limit()).toEqual(expect.any(Function));
  });

  test.each([0, -1, 1.5, Number.NaN, '3'])(
    'rejects invalid request limit %p during middleware creation',
    (limit) => {
      const rateLimiter = new RateLimiter('auth');

      expect(() => rateLimiter.limit({ limit })).toThrow(
        'حداکثر تعداد درخواست باید یک عدد صحیح مثبت باشد',
      );
    },
  );

  test.each([0, -1, 1.5, Number.NaN, '60'])(
    'rejects invalid window %p during middleware creation',
    (window) => {
      const rateLimiter = new RateLimiter('auth');

      expect(() => rateLimiter.limit({ window })).toThrow(
        'بازه زمانی محدودکننده باید یک عدد صحیح مثبت باشد',
      );
    },
  );

  test('uses defaults and allows a request below the limit', async () => {
    mockConsume.mockResolvedValue({
      allowed: true,
      current: 1,
      remaining: 9,
      limit: 10,
      retryAfter: 60,
    });
    const rateLimiter = new RateLimiter('auth');
    const middleware = rateLimiter.limit();
    const res = createResponse();
    const next = jest.fn();

    await middleware(createRequest(), res, next);

    expect(mockConsume).toHaveBeenCalledWith({
      key: 'rate-limit:auth:POST:/api/auth/send-otp:192.168.1.10',
      limit: 10,
      window: 60,
    });
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Limit', 10);
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 9);
    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('passes explicit route policy to the Redis store', async () => {
    mockConsume.mockResolvedValue({
      allowed: true,
      current: 2,
      remaining: 1,
      limit: 3,
      retryAfter: 45,
    });
    const rateLimiter = new RateLimiter('auth');

    await rateLimiter.limit({ limit: 3, window: 120 })(
      createRequest(),
      createResponse(),
      jest.fn(),
    );

    expect(mockConsume).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3, window: 120 }),
    );
  });

  test('forwards a 429 error and retry headers above the limit', async () => {
    mockConsume.mockResolvedValue({
      allowed: false,
      current: 4,
      remaining: 0,
      limit: 3,
      retryAfter: 45,
    });
    const rateLimiter = new RateLimiter('auth');
    const res = createResponse();
    const next = jest.fn();

    await rateLimiter.limit({ limit: 3, window: 120 })(
      createRequest(),
      res,
      next,
    );

    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Limit', 3);
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 0);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', 45);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: STATUES.TOO_MANY_REQUESTS,
    });
  });

  test('forwards Redis failures to Express', async () => {
    const redisError = new Error('redis unavailable');
    mockConsume.mockRejectedValue(redisError);
    const rateLimiter = new RateLimiter('auth');
    const next = jest.fn();

    await rateLimiter.limit()(createRequest(), createResponse(), next);

    expect(next).toHaveBeenCalledWith(redisError);
  });

  test('uses the route pattern instead of query strings or dynamic values', async () => {
    mockConsume.mockResolvedValue({
      allowed: true,
      current: 1,
      remaining: 2,
      limit: 3,
      retryAfter: 60,
    });
    const rateLimiter = new RateLimiter('product');
    const middleware = rateLimiter.limit({ limit: 3 });
    const routeRequest = createRequest({
      method: 'GET',
      baseUrl: '/api',
      route: { path: '/products/:id' },
      originalUrl: '/api/products/123?page=1',
    });

    await middleware(routeRequest, createResponse(), jest.fn());
    await middleware(
      {
        ...routeRequest,
        originalUrl: '/api/products/456?page=50',
      },
      createResponse(),
      jest.fn(),
    );

    const firstKey = mockConsume.mock.calls[0][0].key;
    const secondKey = mockConsume.mock.calls[1][0].key;

    expect(firstKey).toBe(
      'rate-limit:product:GET:/api/products/:id:192.168.1.10',
    );
    expect(secondKey).toBe(firstKey);
  });

  test('separates namespaces, methods, routes, and requester identifiers', async () => {
    mockConsume.mockResolvedValue({
      allowed: true,
      current: 1,
      remaining: 2,
      limit: 3,
      retryAfter: 60,
    });
    const authLimiter = new RateLimiter('auth');
    const productLimiter = new RateLimiter('product');
    const cases = [
      [authLimiter, createRequest()],
      [productLimiter, createRequest()],
      [authLimiter, createRequest({ method: 'GET' })],
      [authLimiter, createRequest({ route: { path: '/login' } })],
      [authLimiter, createRequest({ ip: '2001:db8::1' })],
    ];

    for (const [limiter, req] of cases) {
      await limiter.limit({ limit: 3 })(req, createResponse(), jest.fn());
    }

    const keys = mockConsume.mock.calls.map(([options]) => options.key);

    expect(new Set(keys)).toHaveProperty('size', cases.length);
    expect(keys.at(-1)).toContain('2001:db8::1');
  });
});
