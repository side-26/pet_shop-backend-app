import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  getLandingController,
  updateLandingController,
} from './landing.controller.js';

const router = express.Router();

router.get('/landing', getLandingController);
router.put(
  '/landing',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  updateLandingController,
);

export default router;
