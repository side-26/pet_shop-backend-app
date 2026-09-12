import { USER_AUTH_SESSION } from '#configs/constants.js';

import RedisClient from '../client.js';

const CREATE_SESSION_SCRIPT = `
redis.call('HSET', KEYS[1], 'userId', ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[3])
redis.call('SADD', KEYS[2], ARGV[2])
redis.call('EXPIRE', KEYS[2], ARGV[3])
return 1
`;

const DELETE_USER_SESSIONS_SCRIPT = `
local sessionIds = redis.call('SMEMBERS', KEYS[1])

for _, sessionId in ipairs(sessionIds) do
  redis.call('DEL', ARGV[1] .. ':' .. sessionId)
end

return redis.call('DEL', KEYS[1])
`;

const normalizeRequiredValue = (value, message) => {
  const normalizedValue = value?.toString().trim();

  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
};

export const createUserAuthSessionKey = (sessionId) => {
  const normalizedSessionId = normalizeRequiredValue(
    sessionId,
    'شناسه نشست برای ذخیره نشست ورود در Redis الزامی است',
  );

  return [USER_AUTH_SESSION.KEY_NAMESPACE, normalizedSessionId].join(':');
};

export const createUserAuthSessionsKey = (userId) => {
  const normalizedUserId = normalizeRequiredValue(
    userId,
    'شناسه کاربر برای مدیریت نشست‌های ورود در Redis الزامی است',
  );

  return [USER_AUTH_SESSION.USER_SESSIONS_KEY_NAMESPACE, normalizedUserId].join(
    ':',
  );
};

export class RedisAuthSessionStore {
  #client;

  constructor() {
    this.#client = RedisClient.getClient();
  }

  async create({ sessionId, userId, ttlSeconds }) {
    const key = createUserAuthSessionKey(sessionId);
    const userSessionsKey = createUserAuthSessionsKey(userId);
    const normalizedSessionId = sessionId.toString().trim();
    const normalizedUserId = userId.toString().trim();

    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('زمان انقضای نشست ورود در Redis معتبر نیست');
    }

    await this.#client.eval(CREATE_SESSION_SCRIPT, {
      keys: [key, userSessionsKey],
      arguments: [normalizedUserId, normalizedSessionId, String(ttlSeconds)],
    });
  }

  async isOwnedBy({ sessionId, userId }) {
    const key = createUserAuthSessionKey(sessionId);
    const normalizedUserId = normalizeRequiredValue(
      userId,
      'شناسه کاربر برای بررسی نشست ورود در Redis الزامی است',
    );
    const storedUserId = await this.#client.hGet(key, 'userId');

    return storedUserId === normalizedUserId;
  }

  async deleteByUserId(userId) {
    const normalizedUserId = normalizeRequiredValue(
      userId,
      'شناسه کاربر برای حذف نشست‌های ورود در Redis الزامی است',
    );
    const userSessionsKey = createUserAuthSessionsKey(normalizedUserId);

    await this.#client.eval(DELETE_USER_SESSIONS_SCRIPT, {
      keys: [userSessionsKey],
      arguments: [USER_AUTH_SESSION.KEY_NAMESPACE],
    });
  }
}
