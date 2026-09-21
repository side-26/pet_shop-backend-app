import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import { getAccountController } from './profile.controller.js';
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

export default router;
