import { USER_OTP } from '#configs/constants.js';

import RedisClient from '../client.js';

const RESERVE_OTP_SCRIPT = `
local currentTtl = redis.call('TTL', KEYS[1])

if currentTtl >= -1 then
  return { 0, currentTtl }
end

local reserved = redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2], 'NX')

if reserved then
  return { 1, redis.call('TTL', KEYS[1]) }
end

return { 0, redis.call('TTL', KEYS[1]) }
`;

const SAVE_OTP_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then
  return -1
end

redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return redis.call('TTL', KEYS[1])
`;

const RELEASE_RESERVATION_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end

return 0
`;

const FIND_OTP_SCRIPT = `
local value = redis.call('GET', KEYS[1])

if not value then
  return false
end

local remainingSeconds = redis.call('TTL', KEYS[1])

if remainingSeconds < 0 then
  return false
end

return { value, remainingSeconds }
`;

export const createUserOtpKey = ({ phoneNumber, ip }) => {
  const normalizedPhoneNumber = phoneNumber?.trim();
  const normalizedIp = ip?.trim().toLowerCase();

  if (!normalizedPhoneNumber || !normalizedIp) {
    throw new Error('شماره تلفن و نشانی IP برای ذخیره کد تأیید الزامی است');
  }

  return [
    USER_OTP.KEY_NAMESPACE,
    normalizedPhoneNumber,
    encodeURIComponent(normalizedIp),
  ].join(':');
};

export class RedisOtpStore {
  #client;

  constructor() {
    this.#client = RedisClient.getClient();
  }

  async reserve({ key, reservationId, ttlSeconds }) {
    const [acquiredValue, remainingValue] = await this.#client.eval(
      RESERVE_OTP_SCRIPT,
      {
        keys: [key],
        arguments: [reservationId, String(ttlSeconds)],
      },
    );
    const acquired = Number(acquiredValue) === 1;
    const remainingSeconds = Number(remainingValue);

    if (!Number.isInteger(remainingSeconds) || remainingSeconds < 0) {
      throw new Error('زمان انقضای کد تأیید در Redis معتبر نیست');
    }

    return { acquired, remainingSeconds };
  }

  async save({ key, reservationId, hashedCode, ttlSeconds }) {
    const remainingSeconds = Number(
      await this.#client.eval(SAVE_OTP_SCRIPT, {
        keys: [key],
        arguments: [reservationId, hashedCode, String(ttlSeconds)],
      }),
    );

    if (!Number.isInteger(remainingSeconds) || remainingSeconds < 0) {
      throw new Error('ذخیره کد تأیید در Redis ناموفق بود');
    }

    return remainingSeconds;
  }

  async find(key) {
    const result = await this.#client.eval(FIND_OTP_SCRIPT, { keys: [key] });

    if (!result) return null;

    const [hashedCode, remainingValue] = result;
    const remainingSeconds = Number(remainingValue);

    if (!hashedCode || !Number.isInteger(remainingSeconds)) {
      throw new Error('اطلاعات کد تأیید در Redis معتبر نیست');
    }

    return { hashedCode, remainingSeconds };
  }

  async releaseReservation({ key, reservationId }) {
    const released = Number(
      await this.#client.eval(RELEASE_RESERVATION_SCRIPT, {
        keys: [key],
        arguments: [reservationId],
      }),
    );

    return released === 1;
  }
}
