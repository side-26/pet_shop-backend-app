jest.mock('express', () => ({
  __esModule: true,
  default: {
    Router: jest.fn(() => ({
      delete: jest.fn(),
      get: jest.fn(),
      patch: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
    })),
  },
}));

jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: jest.fn(),
}));

jest.mock('#middlewares/role.middleware.js', () => ({
  roleMiddleware: jest.fn(() => jest.fn()),
}));

jest.mock('#middlewares/upload.middleware.js', () => ({
  uploadAvatar: jest.fn(),
}));

jest.mock('../../infrastructure/redis/rateLimit/rateLimit.core.js', () => ({
  RateLimiter: jest.fn().mockImplementation(() => ({
    limit: jest.fn(() => jest.fn()),
  })),
}));

jest.mock('./users.controller.js', () => ({
  addCartItemController: jest.fn(),
  addUserAddressController: jest.fn(),
  addWishlistItemController: jest.fn(),
  changeUserPasswordController: jest.fn(),
  createUserController: jest.fn(),
  deleteCartItemController: jest.fn(),
  deleteWishlistItemController: jest.fn(),
  disableUserController: jest.fn(),
  editUserAddressController: jest.fn(),
  emptyCartController: jest.fn(),
  enableUserController: jest.fn(),
  getAllUsersListController: jest.fn(),
  getAllUsersListPaginateController: jest.fn(),
  getCartItemsController: jest.fn(),
  getUserAddressListController: jest.fn(),
  getUserByIdController: jest.fn(),
  getWishlistItemsController: jest.fn(),
  loginUserController: jest.fn(),
  refreshTokenController: jest.fn(),
  registerUserController: jest.fn(),
  sendUserOtpController: jest.fn(),
  updateUserPersonalInfoController: jest.fn(),
}));

import express from 'express';

import { RATE_LIMIT, ROUTES } from '#configs/constants.js';

import { RateLimiter } from '../../infrastructure/redis/rateLimit/rateLimit.core.js';
import { loginUserController } from './users.controller.js';
import usersRouter from './users.route.js';

describe('users route policies', () => {
  test('applies a three-request two-minute Redis limiter before login', () => {
    const mockRouter = express.Router.mock.results[0].value;
    const rateLimiter = RateLimiter.mock.results[0].value;
    const loginRateLimitMiddleware = rateLimiter.limit.mock.results[0].value;
    const loginRoute = mockRouter.post.mock.calls.find(
      ([path]) => path === ROUTES.users.login,
    );

    expect(usersRouter).toBe(mockRouter);
    expect(RateLimiter).toHaveBeenCalledWith('users');
    expect(rateLimiter.limit).toHaveBeenCalledWith({
      limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
      window: RATE_LIMIT.LOGIN_WINDOW_SECONDS,
    });
    expect(loginRoute).toEqual([
      ROUTES.users.login,
      loginRateLimitMiddleware,
      loginUserController,
    ]);
  });
});
