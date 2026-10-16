jest.mock('../client.js', () => ({
  __esModule: true,
  default: {
    getClient: jest.fn(),
  },
}));

import { USER_AUTH_SESSION } from '#configs/constants.js';

import RedisClient from '../client.js';
import {
  createUserAuthSessionKey,
  createUserAuthSessionsKey,
  RedisAuthSessionStore,
} from './redisAuthSession.store.js';

describe('Redis auth-session store', () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = { eval: jest.fn(), hGet: jest.fn() };
    RedisClient.getClient.mockReturnValue(client);
  });

  test('creates namespaced session and user-session keys', () => {
    expect(createUserAuthSessionKey(' session-id ')).toBe(
      'auth-session:users:session-id',
    );
    expect(createUserAuthSessionsKey(' user-id ')).toBe(
      'auth-sessions:user:user-id',
    );
  });

  test.each([
    [createUserAuthSessionKey, ''],
    [createUserAuthSessionsKey, ''],
  ])('rejects an empty key identifier', (createKey, value) => {
    expect(() => createKey(value)).toThrow();
  });

  test('atomically stores a user-owned session with bounded TTL', async () => {
    const store = new RedisAuthSessionStore();

    await store.create({
      sessionId: 'session-id',
      userId: 'user-id',
      ttlSeconds: USER_AUTH_SESSION.TTL_SECONDS,
    });

    expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: ['auth-session:users:session-id', 'auth-sessions:user:user-id'],
      arguments: [
        'user-id',
        'session-id',
        String(USER_AUTH_SESSION.TTL_SECONDS),
      ],
    });
  });

  test.each([0, -1, 1.5, Number.NaN])(
    'rejects invalid session TTL %p',
    async (ttlSeconds) => {
      const store = new RedisAuthSessionStore();

      await expect(
        store.create({
          sessionId: 'session-id',
          userId: 'user-id',
          ttlSeconds,
        }),
      ).rejects.toThrow('زمان انقضای نشست ورود در Redis معتبر نیست');
      expect(client.eval).not.toHaveBeenCalled();
    },
  );

  test('confirms ownership only when Redis stores the same user ID', async () => {
    const store = new RedisAuthSessionStore();
    client.hGet.mockResolvedValue('user-id');

    await expect(
      store.isOwnedBy({ sessionId: 'session-id', userId: 'user-id' }),
    ).resolves.toBe(true);
    expect(client.hGet).toHaveBeenCalledWith(
      'auth-session:users:session-id',
      'userId',
    );

    client.hGet.mockResolvedValue('another-user');
    await expect(
      store.isOwnedBy({ sessionId: 'session-id', userId: 'user-id' }),
    ).resolves.toBe(false);
  });

  test('atomically deletes every indexed session for a user', async () => {
    const store = new RedisAuthSessionStore();

    await store.deleteByUserId('user-id');

    expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: ['auth-sessions:user:user-id'],
      arguments: [USER_AUTH_SESSION.KEY_NAMESPACE],
    });
  });

  test('atomically deletes one session and removes it from its user index', async () => {
    const store = new RedisAuthSessionStore();

    await store.deleteBySession({
      sessionId: 'session-id',
      userId: 'user-id',
    });

    expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: ['auth-session:users:session-id', 'auth-sessions:user:user-id'],
      arguments: ['session-id'],
    });
  });
});
