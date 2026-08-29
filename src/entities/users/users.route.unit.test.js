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
  deleteUserByIdController: jest.fn(),
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
  resetUserPasswordController: jest.fn(),
  sendUserOtpController: jest.fn(),
  updateUserPersonalInfoController: jest.fn(),
  verifyUserOtpController: jest.fn(),
}));

import express from 'express';

import { RATE_LIMIT, ROUTES } from '#configs/constants.js';

import { RateLimiter } from '../../infrastructure/redis/rateLimit/rateLimit.core.js';
import { loginUserController } from './users.controller.js';
import usersRouter from './users.route.js';

describe('users route policies', () => {
  test('applies the configured Redis limiter before every users-router endpoint', () => {
    const mockRouter = express.Router.mock.results[0].value;
    const rateLimiter = RateLimiter.mock.results[0].value;
    const standardRateLimitMiddleware = rateLimiter.limit.mock.results[0].value;
    const paginatedRateLimitMiddleware =
      rateLimiter.limit.mock.results[1].value;
    const loginRateLimitMiddleware = rateLimiter.limit.mock.results[2].value;
    const registeredRoutes = [
      ...mockRouter.delete.mock.calls,
      ...mockRouter.get.mock.calls,
      ...mockRouter.patch.mock.calls,
      ...mockRouter.post.mock.calls,
      ...mockRouter.put.mock.calls,
    ];
    const loginRoute = registeredRoutes.find(
      ([path]) => path === ROUTES.users.login,
    );
    const paginatedRoute = registeredRoutes.find(
      ([path]) => path === ROUTES.users.getAllPaginate,
    );
    const standardRoutes = registeredRoutes.filter(
      ([path]) =>
        path !== ROUTES.users.login && path !== ROUTES.users.getAllPaginate,
    );

    expect(usersRouter).toBe(mockRouter);
    expect(RateLimiter).toHaveBeenCalledWith('users');
    expect(rateLimiter.limit).toHaveBeenNthCalledWith(1, {
      limit: RATE_LIMIT.USER_MAX_REQUESTS,
      window: RATE_LIMIT.USER_WINDOW_SECONDS,
    });
    expect(rateLimiter.limit).toHaveBeenNthCalledWith(2, {
      limit: RATE_LIMIT.USER_PAGINATE_MAX_REQUESTS,
      window: RATE_LIMIT.USER_PAGINATE_WINDOW_SECONDS,
    });
    expect(rateLimiter.limit).toHaveBeenNthCalledWith(3, {
      limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
      window: RATE_LIMIT.LOGIN_WINDOW_SECONDS,
    });
    expect(registeredRoutes).toHaveLength(25);
    expect(standardRoutes).toHaveLength(23);
    standardRoutes.forEach((route) => {
      expect(route[1]).toBe(standardRateLimitMiddleware);
    });
    expect(paginatedRoute[1]).toBe(paginatedRateLimitMiddleware);
    expect(loginRoute).toEqual([
      ROUTES.users.login,
      loginRateLimitMiddleware,
      loginUserController,
    ]);
  });
});
