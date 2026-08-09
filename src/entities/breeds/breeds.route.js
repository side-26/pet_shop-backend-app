import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createBreedController,
  deleteBreedController,
  disableBreedController,
  enableBreedController,
  getAllBreedsController,
  getAllBreedsWithPaginationController,
  getBreedController,
  updateBreedController,
} from './breeds.controller.js';

const router = express.Router();

router.get(
  '/breeds/paginate',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getAllBreedsWithPaginationController,
);
router.get(
  '/breeds',
  authenticated,
  roleMiddleware([ROLES.ADMIN, ROLES.SELLER]),
  getAllBreedsController,
);
router.get(
  '/breeds/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getBreedController,
);
router.post(
  '/breeds',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  createBreedController,
);
router.put(
  '/breeds/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  updateBreedController,
);
router.patch(
  '/breeds/:id/enable',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  enableBreedController,
);
router.patch(
  '/breeds/:id/disable',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  disableBreedController,
);
router.delete(
  '/breeds/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteBreedController,
);

export default router;
