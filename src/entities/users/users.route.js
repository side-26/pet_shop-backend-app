import express from 'express';

import {
  changeUserPasswordController,
  createUserController,
  disableUserController,
  enableUserController,
  getAllUsersListController,
  getAllUsersListPaginateController,
  getUserByIdController,
  getUserCartListController,
  loginUserController,
  refreshTokenController,
  updateUserLocationInfoController,
} from './users.controller.js';
import { authenticated } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import { ROLES } from '#configs/constants.js';

const router = express.Router();

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
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
    #swagger.responses[404] = {
      description: 'User not found',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  loginUserController,
);

router.post(
  '/users/refresh-token',
  authenticated,
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Refresh user token'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/RefreshTokenBody' } } }
    }
    #swagger.responses[200] = {
      description: 'Token refreshed successfully',  )

router.put(
  '/users/editInfo',
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Update personal info'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/UpdateUserPersonalInfoBody' } } }
    }
    #swagger.responses[200] = {
      description: 'Personal info updated',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
    #swagger.responses[422] = {
      description: 'Validation error',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  refreshTokenController,
);

router.put(
  '/users/editLocationInfo',
  authenticated,
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Update location info'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/UpdateUserLocationInfoBody' } } }
    }
    #swagger.responses[200] = {
      description: 'Location info updated',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
    #swagger.responses[422] = {
      description: 'Validation error',
      content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  */
  updateUserLocationInfoController,
);

router.put(
  '/users/changePassword',
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

router.get(
  '/users/cart/:id',
  authenticated,
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Get user cart'
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
    #swagger.responses[200] = {
      description: 'User cart',
      content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
    }
  */
  getUserCartListController,
);

export default router;
