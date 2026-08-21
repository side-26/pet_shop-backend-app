jest.mock('../client.js', () => ({
  __esModule: true,
  default: {
    getClient: jest.fn(),
  },
}));

import { USER_OTP, USER_TEMPORARY_TOKEN } from '#configs/constants.js';

import RedisClient from '../client.js';
import {
  createUserOtpKey,
  createUserTemporaryTokenKey,
  createUserTemporaryTokenRateLimitKey,
  RedisOtpStore,
} from './redisOtp.store.js';

describe('Redis OTP store', () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = { eval: jest.fn() };
    RedisClient.getClient.mockReturnValue(client);
  });

  test('creates a namespaced key from the phone number and normalized IP', () => {
    expect(
      createUserOtpKey({
        phoneNumber: ' 09123456789 ',
        ip: ' ::FFFF:127.0.0.1 ',
      }),
    ).toBe('otp:users:09123456789:%3A%3Affff%3A127.0.0.1');
  });

  test.each([
    { phoneNumber: '', ip: '127.0.0.1' },
    { phoneNumber: '09123456789', ip: '' },
  ])('rejects an incomplete OTP key input %#', (input) => {
    expect(() => createUserOtpKey(input)).toThrow(
      'شماره تلفن و نشانی IP برای ذخیره کد تأیید الزامی است',
    );
  });

  test('creates a namespaced temporary-token key', () => {
    expect(createUserTemporaryTokenKey(' 09123456789 ')).toBe(
      'temporary-token:users:09123456789',
    );
  });

  test('rejects an empty temporary-token phone number', () => {
    expect(() => createUserTemporaryTokenKey('')).toThrow(
      'شماره تلفن برای ذخیره توکن موقت در Redis الزامی است',
    );
  });

  test('creates a phone-and-IP temporary-token rate-limit key', () => {
    expect(
      createUserTemporaryTokenRateLimitKey({
        phoneNumber: ' 09123456789 ',
        ip: ' ::FFFF:127.0.0.1 ',
      }),
    ).toBe(
      'rate-limit:temporary-token:users:09123456789:%3A%3Affff%3A127.0.0.1',
    );
  });

  test.each([
    {
      redisResult: [1, USER_OTP.RESERVATION_TTL_SECONDS],
      expected: {
        acquired: true,
        remainingSeconds: USER_OTP.RESERVATION_TTL_SECONDS,
      },
    },
    {
      redisResult: [0, 73],
      expected: { acquired: false, remainingSeconds: 73 },
    },
  ])(
    'atomically maps reservation result $redisResult',
    async ({ redisResult, expected }) => {
      client.eval.mockResolvedValue(redisResult);
      const store = new RedisOtpStore();

      await expect(
        store.reserve({
          key: 'otp:users:09123456789:127.0.0.1',
          reservationId: 'pending:request-id',
          ttlSeconds: USER_OTP.RESERVATION_TTL_SECONDS,
        }),
      ).resolves.toEqual(expected);
      expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
        keys: ['otp:users:09123456789:127.0.0.1'],
        arguments: [
          'pending:request-id',
          String(USER_OTP.RESERVATION_TTL_SECONDS),
        ],
      });
    },
  );

  test.each([[[0, -1]], [[0, -2]], [[0, Number.NaN]]])(
    'rejects invalid reservation result %p',
    async (redisResult) => {
      client.eval.mockResolvedValue(redisResult);
      const store = new RedisOtpStore();

      await expect(
        store.reserve({
          key: 'otp:users:09123456789:127.0.0.1',
          reservationId: 'pending:request-id',
          ttlSeconds: USER_OTP.RESERVATION_TTL_SECONDS,
        }),
      ).rejects.toThrow('زمان انقضای کد تأیید در Redis معتبر نیست');
    },
  );

  test('atomically stores the hash with expiration and returns its TTL', async () => {
    client.eval.mockResolvedValue(USER_OTP.TTL_SECONDS);
    const store = new RedisOtpStore();

    await expect(
      store.save({
        key: 'otp:users:09123456789:127.0.0.1',
        reservationId: 'pending:request-id',
        hashedCode: 'hashed-code',
        ttlSeconds: USER_OTP.TTL_SECONDS,
      }),
    ).resolves.toBe(USER_OTP.TTL_SECONDS);
    expect(RedisClient.getClient).toHaveBeenCalledTimes(1);
    expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: ['otp:users:09123456789:127.0.0.1'],
      arguments: [
        'pending:request-id',
        'hashed-code',
        String(USER_OTP.TTL_SECONDS),
      ],
    });
  });

  test.each([-2, -1, Number.NaN])(
    'rejects invalid remaining TTL %p',
    async (remainingSeconds) => {
      client.eval.mockResolvedValue(remainingSeconds);
      const store = new RedisOtpStore();

      await expect(
        store.save({
          key: 'otp:users:09123456789:127.0.0.1',
          reservationId: 'pending:request-id',
          hashedCode: 'hashed-code',
          ttlSeconds: USER_OTP.TTL_SECONDS,
        }),
      ).rejects.toThrow('ذخیره کد تأیید در Redis ناموفق بود');
    },
  );

  test('propagates Redis failures', async () => {
    const redisError = new Error('redis unavailable');
    client.eval.mockRejectedValue(redisError);
    const store = new RedisOtpStore();

    await expect(
      store.save({
        key: 'otp:users:09123456789:127.0.0.1',
        reservationId: 'pending:request-id',
        hashedCode: 'hashed-code',
        ttlSeconds: USER_OTP.TTL_SECONDS,
      }),
    ).rejects.toBe(redisError);
  });

  test('atomically finds the OTP hash with its remaining TTL', async () => {
    client.eval.mockResolvedValue(['hashed-code', '75']);
    const store = new RedisOtpStore();

    await expect(
      store.find('otp:users:09123456789:127.0.0.1'),
    ).resolves.toEqual({ hashedCode: 'hashed-code', remainingSeconds: 75 });
    expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: ['otp:users:09123456789:127.0.0.1'],
    });
  });

  test('returns null when the OTP key does not exist or has expired', async () => {
    client.eval.mockResolvedValue(null);
    const store = new RedisOtpStore();

    await expect(
      store.find('otp:users:09123456789:127.0.0.1'),
    ).resolves.toBeNull();
  });

  test('rejects malformed OTP lookup data', async () => {
    client.eval.mockResolvedValue(['hashed-code', 'invalid']);
    const store = new RedisOtpStore();

    await expect(store.find('otp:users:key')).rejects.toThrow(
      'اطلاعات کد تأیید در Redis معتبر نیست',
    );
  });
  test.each([
    {
      redisResult: [1, 300],
      expected: { allowed: true, current: 1, remaining: 2, retryAfter: 300 },
    },
    {
      redisResult: [4, 240],
      expected: { allowed: false, current: 4, remaining: 0, retryAfter: 240 },
    },
  ])(
    'atomically limits temporary-token request count $redisResult',
    async ({ redisResult, expected }) => {
      client.eval.mockResolvedValue(redisResult);
      const store = new RedisOtpStore();

      await expect(
        store.consumeTemporaryTokenRequest({
          key: 'rate-limit:temporary-token:users:09123456789:127.0.0.1',
          limit: USER_TEMPORARY_TOKEN.MAX_REQUESTS,
          window: USER_TEMPORARY_TOKEN.TTL_SECONDS,
        }),
      ).resolves.toEqual(expected);
      expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
        keys: ['rate-limit:temporary-token:users:09123456789:127.0.0.1'],
        arguments: [String(USER_TEMPORARY_TOKEN.TTL_SECONDS)],
      });
    },
  );

  test('atomically returns the current temporary token without replacing it', async () => {
    client.eval.mockResolvedValue(['current-token', 242]);
    const store = new RedisOtpStore();

    await expect(
      store.getOrSaveTemporaryToken({
        key: 'temporary-token:users:09123456789',
        temporaryToken: 'candidate-token',
        ttlSeconds: USER_TEMPORARY_TOKEN.TTL_SECONDS,
      }),
    ).resolves.toEqual({
      temporaryToken: 'current-token',
      remainingSeconds: 242,
    });
    expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: ['temporary-token:users:09123456789'],
      arguments: ['candidate-token', String(USER_TEMPORARY_TOKEN.TTL_SECONDS)],
    });
  });

  test('rejects malformed temporary-token storage data', async () => {
    client.eval.mockResolvedValue([null, -2]);
    const store = new RedisOtpStore();

    await expect(
      store.getOrSaveTemporaryToken({
        key: 'temporary-token:users:09123456789',
        temporaryToken: 'candidate-token',
        ttlSeconds: USER_TEMPORARY_TOKEN.TTL_SECONDS,
      }),
    ).rejects.toThrow('ذخیره یا بازیابی توکن موقت در Redis ناموفق بود');
  });
  test.each([
    { redisResult: 1, expected: true },
    { redisResult: 0, expected: false },
  ])(
    'safely maps reservation release result $redisResult',
    async ({ redisResult, expected }) => {
      client.eval.mockResolvedValue(redisResult);
      const store = new RedisOtpStore();

      await expect(
        store.releaseReservation({
          key: 'otp:users:09123456789:127.0.0.1',
          reservationId: 'pending:request-id',
        }),
      ).resolves.toBe(expected);
      expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
        keys: ['otp:users:09123456789:127.0.0.1'],
        arguments: ['pending:request-id'],
      });
    },
  );
});
