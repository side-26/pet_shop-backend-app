import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createPetController,
  deletePetController,
  disablePetController,
  editPetController,
  enablePetController,
  getCustomerPetController,
  getCustomerPetListController,
  getManagementPetController,
  getManagementPetListController,
  updatePetController,
} from './pets.controller.js';

const router = express.Router();
const managementRoles = [ROLES.ADMIN, ROLES.SELLER];

router.get('/pets', getCustomerPetListController);
router.get('/pets/customer/:id', getCustomerPetController);
router.get(
  '/pets/get-full-info-paginate-list',
  authenticated,
  roleMiddleware(managementRoles),
  getManagementPetListController,
);
router.get(
  '/pets/manage/:id',
  authenticated,
  roleMiddleware(managementRoles),
  getManagementPetController,
);
router.post(
  '/pets',
  authenticated,
  roleMiddleware(managementRoles),
  createPetController,
);
router.put(
  '/pets/:id',
  authenticated,
  roleMiddleware(managementRoles),
  updatePetController,
);
router.patch(
  '/pets/:id',
  authenticated,
  roleMiddleware(managementRoles),
  editPetController,
);
router.patch(
  '/pets/:id/enable',
  authenticated,
  roleMiddleware(managementRoles),
  enablePetController,
);
router.patch(
  '/pets/:id/disable',
  authenticated,
  roleMiddleware(managementRoles),
  disablePetController,
);
router.delete(
  '/pets/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deletePetController,
);

export default router;
