jest.mock('#utils/helpers.js', () => ({
  getUserSessionClaims: jest.fn((decoded) => ({
    userId: decoded.userId.toString(),
    sessionId: decoded.sessionId,
  })),
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message || 'خطای سمت سرور');
    error.statusCode = statusCode;
    throw error;
  }),
  verifyUser: jest.fn(),
}));

jest.mock('../infrastructure/redis/auth/redisAuthSession.store.js', () => {
  const isOwnedBy = jest.fn();

  return {
    __mockRedisAuthSessionIsOwnedBy: isOwnedBy,
    RedisAuthSessionStore: jest.fn(() => ({ isOwnedBy })),
  };
});

import { STATUES } from '#configs/constants.js';
import { verifyUser } from '#utils/helpers.js';

import { __mockRedisAuthSessionIsOwnedBy as mockIsOwnedBy } from '../infrastructure/redis/auth/redisAuthSession.store.js';
import { authenticated } from './auth.middleware.js';

describe('authenticated middleware', () => {
  const request = {
    get: jest.fn(() => 'Bearer access-token'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    verifyUser.mockReturnValue({
      userId: 'user-id',
      role: 'customer',
      sessionId: 'session-id',
    });
    mockIsOwnedBy.mockResolvedValue(true);
  });

  test('accepts a valid JWT only when its Redis session belongs to its user', async () => {
    const next = jest.fn();

    await authenticated(request, {}, next);

    expect(mockIsOwnedBy).toHaveBeenCalledWith({
      sessionId: 'session-id',
      userId: 'user-id',
    });
    expect(request.user).toEqual({
      userId: 'user-id',
      role: 'customer',
      sessionId: 'session-id',
    });
    expect(next).toHaveBeenCalledWith();
  });

  test('rejects a signed token whose Redis session is absent or belongs to another user', async () => {
    const next = jest.fn();
    mockIsOwnedBy.mockResolvedValue(false);

    await authenticated(request, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: STATUES.UN_AUTHORIZED,
        message: 'نشست ورود معتبر نیست یا منقضی شده است',
      }),
    );
  });
});
