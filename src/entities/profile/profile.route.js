import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createAddressController,
  deleteAvatarController,
  deleteAddressController,
  getAccountController,
  getAddressByIdController,
  getAddressesController,
  getOrderByIdController,
  getOrdersController,
  resetPasswordController,
  updateAddressController,
} from './profile.controller.js';
import { PROFILE_ROUTES } from './route.path.js';

const router = express.Router();

router.get(
  PROFILE_ROUTES.profileAccount,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  /* #swagger.summary = 'Get the authenticated customer account'
     #swagger.description = 'Returns the authenticated enabled customer’s personal information. The profile module owns no MongoDB collection and reads the existing Users collection.'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Customer personal information' }
     #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted' }
     #swagger.responses[403] = { description: 'Customer role required' } */
  getAccountController,
);

router.delete(
  PROFILE_ROUTES.profileAvatar,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  /* #swagger.summary = 'Delete the authenticated customer avatar'
     #swagger.description = 'Removes only the avatar currently associated with the authenticated customer account; no image URL is accepted from the client.'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Customer avatar deleted' }
     #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted' }
     #swagger.responses[403] = { description: 'Customer role required' } */
  deleteAvatarController,
);

router.post(
  PROFILE_ROUTES.profileResetPassword,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  /* #swagger.summary = 'Reset the authenticated customer password'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ChangeUserPasswordBody' } } } }
     #swagger.responses[200] = { description: 'Password reset successfully' }
     #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted' }
     #swagger.responses[403] = { description: 'Customer role required' }
     #swagger.responses[422] = { description: 'Invalid password data or incorrect old password' } */
  resetPasswordController,
);

router.post(
  PROFILE_ROUTES.profileAddresses,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  /* #swagger.summary = 'Create an authenticated customer address'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[201] = { description: 'Created customer address' }
     #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted' }
     #swagger.responses[403] = { description: 'Customer role required' }
     #swagger.responses[422] = { description: 'Invalid address data or address limit reached' } */
  createAddressController,
);

router.get(
  PROFILE_ROUTES.profileAddresses,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  /* #swagger.summary = 'Get the authenticated customer addresses'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Customer address list' }
     #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted' }
     #swagger.responses[403] = { description: 'Customer role required' } */
  getAddressesController,
);

router.get(
  PROFILE_ROUTES.profileAddressById,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  /* #swagger.summary = 'Get one authenticated customer address'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['addressId'] = { in: 'path', required: true, schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } }
     #swagger.responses[200] = { description: 'Customer address detail' }
     #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted' }
     #swagger.responses[403] = { description: 'Customer role required' }
     #swagger.responses[404] = { description: 'Address not found' }
     #swagger.responses[422] = { description: 'Invalid address ID' } */
  getAddressByIdController,
);

router.patch(
  PROFILE_ROUTES.profileAddressById,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  /* #swagger.summary = 'Update one authenticated customer address'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['addressId'] = { in: 'path', required: true, schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } }
     #swagger.responses[200] = { description: 'Updated customer address' }
     #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted' }
     #swagger.responses[403] = { description: 'Customer role required' }
     #swagger.responses[404] = { description: 'Address not found' }
     #swagger.responses[422] = { description: 'Invalid address data or ID' } */
  updateAddressController,
);

router.delete(
  PROFILE_ROUTES.profileAddressById,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  /* #swagger.summary = 'Delete one authenticated customer address'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['addressId'] = { in: 'path', required: true, schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } }
     #swagger.responses[200] = { description: 'Deleted customer address' }
     #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted' }
     #swagger.responses[403] = { description: 'Customer role required' }
     #swagger.responses[404] = { description: 'Address not found' }
     #swagger.responses[422] = { description: 'Invalid address ID' } */
  deleteAddressController,
);

router.get(
  PROFILE_ROUTES.profileOrders,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  /* #swagger.summary = 'List authenticated customer orders'
     #swagger.description = 'Returns `{ isSuccess: true, data: { result, pagination } }`, where `result` is the current page of immutable customer order snapshots.'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['page'] = { in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }
     #swagger.parameters['limit'] = { in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
     #swagger.responses[200] = { description: 'Paginated customer orders' }
     #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted' }
     #swagger.responses[403] = { description: 'Customer role required' }
     #swagger.responses[422] = { description: 'Invalid order query' } */
  getOrdersController,
);

router.get(
  PROFILE_ROUTES.profileOrderById,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  /* #swagger.summary = 'Get one authenticated customer order'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } }
     #swagger.responses[200] = { description: 'Owned order detail' }
     #swagger.responses[401] = { description: 'Authentication is invalid, or the account is disabled or deleted' }
     #swagger.responses[403] = { description: 'Customer role required' }
     #swagger.responses[404] = { description: 'Order not found' }
     #swagger.responses[422] = { description: 'Invalid order ID' } */
  getOrderByIdController,
);

export default router;
