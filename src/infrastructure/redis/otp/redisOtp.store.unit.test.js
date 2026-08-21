jest.mock('../client.js', () => ({
  __esModule: true,
  default: {
    getClient: jest.fn(),
  },
}));

import { USER_OTP } from '#configs/constants.js';

import RedisClient from '../client.js';
import { createUserOtpKey, RedisOtpStore } from './redisOtp.store.js';

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
