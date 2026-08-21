import express from 'express';

import { RATE_LIMIT, ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import { uploadAvatar } from '#middlewares/upload.middleware.js';

import { RateLimiter } from '../../infrastructure/redis/rateLimit/rateLimit.core.js';
import {
  addCartItemController,
  addUserAddressController,
  addWishlistItemController,
  changeUserPasswordController,
  createUserController,
  disableUserController,
  deleteCartItemController,
  deleteWishlistItemController,
  emptyCartController,
  enableUserController,
  getAllUsersListController,
  getAllUsersListPaginateController,
  getCartItemsController,
  getUserByIdController,
  getUserAddressListController,
  getWishlistItemsController,
  loginUserController,
  refreshTokenController,
  registerUserController,
  sendUserOtpController,
  editUserAddressController,
  updateUserPersonalInfoController,
} from './users.controller.js';

const router = express.Router();
const userRateLimiter = new RateLimiter('users');

router.post(
  '/users',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Create a new user'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/CreateUserBody' } } }
    }
    #swagger.responses[201] = {
      description: 'User created successfully',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
    #swagger.responses[422] = {
      description: 'Validation error',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  createUserController,
);

router.post(
  '/users/register',
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Register a customer account'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/RegisterUserBody' } } }
    }
    #swagger.responses[201] = {
      description: 'Customer account created',
      content: { "application/json": { schema: { type: 'object', properties: { isSuccess: { type: 'boolean' }, message: { type: 'string' } } } } }
    }
    #swagger.responses[422] = {
      description: 'Validation error or existing user',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
    #swagger.responses[405] = {
      description: 'Method not allowed',
      headers: { Allow: { schema: { type: 'string' }, example: 'POST' } },
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  registerUserController,
);

router.post(
  '/users/send-otp',
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Send a six-digit OTP to an existing user'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/SendUserOtpBody' } } }
    }
    #swagger.responses[200] = {
      description: 'OTP sent and cached for two minutes, or active cache TTL returned without resending',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SendUserOtpSuccessResponse' } } }
    }
    #swagger.responses[404] = {
      description: 'User not found',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
    #swagger.responses[422] = {
      description: 'Validation error',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
    #swagger.responses[503] = {
      description: 'OTP provider unavailable, rejected the request, or returned an invalid code',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  sendUserOtpController,
);

router.post(
  '/users/login',
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Login user'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/LoginUserBody' } } }
    }
    #swagger.responses[200] = {
      description: 'User logged in successfully',
      content: { "application/json": { schema: { $ref: '#/components/schemas/LoginSuccessResponse' } } }
    }
    #swagger.responses[404] = {
      description: 'User not found',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
    #swagger.responses[429] = {
      description: 'More than three login requests were sent from the same IP within two minutes',
      headers: {
        'RateLimit-Limit': { schema: { type: 'integer' }, example: 3 },
        'RateLimit-Remaining': { schema: { type: 'integer' }, example: 0 },
        'Retry-After': { schema: { type: 'integer' }, description: 'Seconds until the current rate-limit window expires' }
      },
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  userRateLimiter.limit({
    limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
    window: RATE_LIMIT.LOGIN_WINDOW_SECONDS,
  }),
  loginUserController,
);

router.post('/users/refresh-token', refreshTokenController);

router.put(
  '/users/edit-info',
  authenticated,
  uploadAvatar,
  updateUserPersonalInfoController,
);

router.post('/users/addresses', authenticated, addUserAddressController);

router.patch(
  '/users/addresses/:addressId',
  authenticated,
  editUserAddressController,
);
router.get('/users/addresses', authenticated, getUserAddressListController);

router.post(
  '/cart/add',
  authenticated,
  /*
    #swagger.tags = ['Cart']
    #swagger.summary = "Add an item to the authenticated user's cart"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/AddCartItemBody' } } } }
    #swagger.responses[201] = { description: 'Cart updated', content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
    #swagger.responses[401] = { description: 'Authentication required' }
    #swagger.responses[404] = { description: 'Product or Pet not found' }
    #swagger.responses[422] = { description: 'Validation error' }
  */
  addCartItemController,
);
router.delete(
  '/cart/delete/:id',
  authenticated,
  /*
    #swagger.tags = ['Cart']
    #swagger.summary = "Delete an item from the authenticated user's cart"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } }
    #swagger.responses[200] = { description: 'Cart item deleted' }
    #swagger.responses[404] = { description: 'Cart item not found' }
    #swagger.responses[422] = { description: 'Invalid cart item ID' }
  */
  deleteCartItemController,
);
router.get(
  '/cart/all',
  authenticated,
  /*
    #swagger.tags = ['Cart']
    #swagger.summary = "Get the authenticated user's cart"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Current cart', content: { "application/json": { schema: { type: 'object', properties: { isSuccess: { type: 'boolean' }, data: { $ref: '#/components/schemas/Cart' } } } } } }
  */
  getCartItemsController,
);
router.delete(
  '/cart/empty',
  authenticated,
  /*
    #swagger.tags = ['Cart']
    #swagger.summary = "Empty the authenticated user's cart"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Cart emptied' }
  */
  emptyCartController,
);

router.post('/wishlist/add', authenticated, addWishlistItemController);
router.delete(
  '/wishlist/delete/:id',
  authenticated,
  deleteWishlistItemController,
);
router.get('/wishlist/all', authenticated, getWishlistItemsController);

router.put(
  '/users/change-password',
  authenticated,
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Change user password'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/ChangeUserPasswordBody' } } }
    }
    #swagger.responses[200] = {
      description: 'Password changed successfully',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
    #swagger.responses[400] = {
      description: 'Wrong old password',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  changeUserPasswordController,
);

router.put(
  '/users/disable/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Disable a user'
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
    #swagger.responses[200] = {
      description: 'User disabled',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
  */
  disableUserController,
);

router.put(
  '/users/enable/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Enable a user'
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
    #swagger.responses[200] = {
      description: 'User enabled',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
  */
  enableUserController,
);

router.get(
  '/users/all',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Get all users'
    #swagger.responses[200] = {
      description: 'List of users',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
  */
  getAllUsersListController,
);

router.get(
  '/users/paginate',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Get paginated users'
    #swagger.parameters['page'] = { in: 'query', schema: { type: 'integer', default: 1 } }
    #swagger.parameters['pageSize'] = { in: 'query', schema: { type: 'integer', default: 10 } }
    #swagger.responses[200] = {
      description: 'Paginated user list',
      content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } }
    }
  */
  getAllUsersListPaginateController,
);

router.get(
  '/users/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Get user by ID'
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
    #swagger.responses[200] = {
      description: 'User data',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
    #swagger.responses[404] = {
      description: 'User not found',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  getUserByIdController,
);

export default router;
