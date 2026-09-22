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
  createDeliveryQuoteController,
  disableUserController,
  deleteCartItemController,
  deleteUserByIdController,
  deleteWishlistItemController,
  emptyCartController,
  enableUserController,
  getAllUsersListController,
  getAllUsersListPaginateController,
  getCurrentUserController,
  getCartItemsController,
  getUserByIdController,
  getUserAddressListController,
  getWishlistItemsController,
  loginUserController,
  logoutUserController,
  refreshTokenController,
  registerUserController,
  sendUserOtpController,
  selectDeliveryWindowController,
  resetUserPasswordController,
  editUserAddressController,
  updateUserPersonalInfoController,
  verifyUserOtpController,
} from './users.controller.js';

import { USER_ROUTES } from './route.path.js';

const router = express.Router();
const userRateLimiter = new RateLimiter('users');
const standardUserRateLimit = userRateLimiter.limit({
  limit: RATE_LIMIT.USER_MAX_REQUESTS,
  window: RATE_LIMIT.USER_WINDOW_SECONDS,
});
const paginatedUserListRateLimit = userRateLimiter.limit({
  limit: RATE_LIMIT.USER_PAGINATE_MAX_REQUESTS,
  window: RATE_LIMIT.USER_PAGINATE_WINDOW_SECONDS,
});
const loginUserRateLimit = userRateLimiter.limit({
  limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
  window: RATE_LIMIT.LOGIN_WINDOW_SECONDS,
});

router.post(
  USER_ROUTES.users,
  standardUserRateLimit,
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
  USER_ROUTES.usersRegister,
  standardUserRateLimit,
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
  USER_ROUTES.usersSendOtp,
  standardUserRateLimit,
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
  USER_ROUTES.usersVerify,
  standardUserRateLimit,
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Verify an OTP for the requester phone number and IP'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/VerifyUserOtpBody' } } }
    }
    #swagger.responses[200] = {
      description: 'OTP verified; returns login data or a five-minute password-reset token',
      content: { "application/json": { schema: { $ref: '#/components/schemas/VerifyUserOtpSuccessResponse' } } }
    }
    #swagger.responses[403] = {
      description: 'More than three password-reset token requests were made for the phone and requester IP within five minutes',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }

    #swagger.responses[422] = {
      description: 'Validation error, expired OTP, or incorrect OTP',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  verifyUserOtpController,
);

router.post(
  USER_ROUTES.usersLogin,
  /* #swagger.tags = ['Users']
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
  loginUserRateLimit,
  loginUserController,
);

router.post(
  USER_ROUTES.usersResetPassword,
  standardUserRateLimit,
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Reset a user password with a temporary OTP token'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/ResetUserPasswordBody' } } }
    }
    #swagger.responses[200] = {
      description: 'Password reset successfully and temporary token invalidated',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ResetUserPasswordSuccessResponse' } } }
    }
    #swagger.responses[403] = {
      description: 'Temporary token is missing, malformed, expired, invalid, or does not match Redis',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
    #swagger.responses[422] = {
      description: 'Password validation error',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  resetUserPasswordController,
);

router.post(
  USER_ROUTES.usersRefreshToken,
  standardUserRateLimit,
  refreshTokenController,
);

router.post(
  USER_ROUTES.usersLogout,
  standardUserRateLimit,
  authenticated,
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Log out the current device session'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Current session invalidated successfully',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
    #swagger.responses[401] = {
      description: 'Authentication or login session is invalid',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  logoutUserController,
);

router.put(
  USER_ROUTES.usersEditInfo,
  standardUserRateLimit,
  authenticated,
  uploadAvatar,
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Update editable personal information'
    #swagger.description = 'Updates firstName, lastName, email, nationalCode, age, and birthDate. avatar is accepted only as the optional multipart file, not as a body URL. Customers may update only themselves; admins may provide userId to target another account.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/UpdateUserPersonalInfoBody' } } } }
    #swagger.responses[200] = { description: 'Personal information updated' }
    #swagger.responses[403] = { description: 'Customers cannot update another account' }
    #swagger.responses[422] = { description: 'Invalid editable personal information or avatar file' }
  */
  updateUserPersonalInfoController,
);

router.post(
  USER_ROUTES.usersAddresses,
  standardUserRateLimit,
  authenticated,
  addUserAddressController,
);

router.patch(
  USER_ROUTES.usersAddressesByAddressId,
  standardUserRateLimit,
  authenticated,
  editUserAddressController,
);
router.get(
  USER_ROUTES.usersAddresses,
  standardUserRateLimit,
  authenticated,
  getUserAddressListController,
);

router.post(
  USER_ROUTES.cartAdd,
  standardUserRateLimit,
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
  USER_ROUTES.cartDeleteById,
  standardUserRateLimit,
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
  USER_ROUTES.cartAll,
  standardUserRateLimit,
  authenticated,
  /*
    #swagger.tags = ['Cart']
    #swagger.summary = "Get the authenticated user's cart"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Current cart', content: { "application/json": { schema: { type: 'object', properties: { isSuccess: { type: 'boolean' }, data: { $ref: '#/components/schemas/Cart' } } } } } }
  */
  getCartItemsController,
);
router.post(
  USER_ROUTES.cartDeliveryWindows,
  standardUserRateLimit,
  authenticated,
  /*
    #swagger.tags = ['Cart']
    #swagger.summary = 'Create mock delivery-window options for an Iranian address'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/CreateDeliveryQuoteBody' } } } }
    #swagger.responses[201] = { description: 'Delivery-window quote created', content: { "application/json": { schema: { type: 'object', properties: { isSuccess: { type: 'boolean' }, data: { $ref: '#/components/schemas/DeliveryQuote' } } } } } }
    #swagger.responses[404] = { description: 'Address not found' }
    #swagger.responses[422] = { description: 'Empty cart or validation error' }
    #swagger.responses[429] = { description: 'Too many requests' }
  */
  createDeliveryQuoteController,
);
router.patch(
  USER_ROUTES.cartDeliveryWindow,
  standardUserRateLimit,
  authenticated,
  /*
    #swagger.tags = ['Cart']
    #swagger.summary = 'Select one delivery window from the active quote'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/SelectDeliveryWindowBody' } } } }
    #swagger.responses[200] = { description: 'Delivery window selected' }
    #swagger.responses[404] = { description: 'Quote or delivery window not found' }
    #swagger.responses[422] = { description: 'Expired quote or validation error' }
    #swagger.responses[429] = { description: 'Too many requests' }
  */
  selectDeliveryWindowController,
);
router.delete(
  USER_ROUTES.cartEmpty,
  standardUserRateLimit,
  authenticated,
  /*
    #swagger.tags = ['Cart']
    #swagger.summary = "Empty the authenticated user's cart"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Cart emptied' }
  */
  emptyCartController,
);

router.post(
  USER_ROUTES.wishlistAdd,
  standardUserRateLimit,
  authenticated,
  addWishlistItemController,
);
router.delete(
  USER_ROUTES.wishlistDeleteById,
  standardUserRateLimit,
  authenticated,
  deleteWishlistItemController,
);
router.get(
  USER_ROUTES.wishlistAll,
  standardUserRateLimit,
  authenticated,
  getWishlistItemsController,
);

router.put(
  USER_ROUTES.usersChangePassword,
  standardUserRateLimit,
  authenticated,
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Change user password'
    #swagger.security = [{ "bearerAuth": [] }]
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
  USER_ROUTES.usersDisableById,
  standardUserRateLimit,
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
  USER_ROUTES.usersEnableById,
  standardUserRateLimit,
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
  USER_ROUTES.usersAll,
  standardUserRateLimit,
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
  USER_ROUTES.usersPaginate,
  paginatedUserListRateLimit,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Get paginated users'
    #swagger.parameters['page'] = { in: 'query', schema: { type: 'integer', default: 1 } }
    #swagger.parameters['limit'] = { in: 'query', schema: { type: 'integer', default: 10 } }
    #swagger.parameters['isEnable'] = { in: 'query', schema: { type: 'boolean' }, description: 'Filter users by enabled status' }
    #swagger.responses[200] = {
      description: 'Paginated user list',
      content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } }
    }
  */
  getAllUsersListPaginateController,
);

router.get(
  USER_ROUTES.usersCurrent,
  standardUserRateLimit,
  authenticated,
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Get the authenticated current user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Current user data', content: { "application/json": { schema: { $ref: '#/components/schemas/CurrentUserResponse' } } } }
    #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted', content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
  */
  getCurrentUserController,
);

router.get(
  USER_ROUTES.usersById,
  standardUserRateLimit,
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

router.delete(
  USER_ROUTES.usersById,
  standardUserRateLimit,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Delete a user by ID'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } }
    #swagger.responses[200] = {
      description: 'User deleted successfully',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
    #swagger.responses[401] = {
      description: 'Authentication required',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
    #swagger.responses[403] = {
      description: 'Admin role required',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
    #swagger.responses[404] = {
      description: 'User not found',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
    #swagger.responses[422] = {
      description: 'Invalid user ID',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  deleteUserByIdController,
);

export default router;
