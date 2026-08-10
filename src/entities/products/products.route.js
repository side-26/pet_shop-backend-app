import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createProductController,
  deleteProductController,
  disableProductController,
  editProductController,
  enableProductController,
  getCustomerProductController,
  getCustomerProductListController,
  getManagementProductController,
  getManagementProductListController,
  updateProductController,
} from './products.controller.js';

const router = express.Router();
const managementRoles = [ROLES.ADMIN, ROLES.SELLER];

router.get('/products', getCustomerProductListController);
router.get('/products/customer/:id', getCustomerProductController);
router.get(
  '/products/get-full-info-paginate-list',
  authenticated,
  roleMiddleware(managementRoles),
  getManagementProductListController,
);
router.get(
  '/products/manage/:id',
  authenticated,
  roleMiddleware(managementRoles),
  getManagementProductController,
);
router.post(
  '/products',
  authenticated,
  roleMiddleware(managementRoles),
  createProductController,
);
router.put(
  '/products/:id',
  authenticated,
  roleMiddleware(managementRoles),
  updateProductController,
);
router.patch(
  '/products/:id',
  authenticated,
  roleMiddleware(managementRoles),
  editProductController,
);
router.patch(
  '/products/:id/enable',
  authenticated,
  roleMiddleware(managementRoles),
  enableProductController,
);
router.patch(
  '/products/:id/disable',
  authenticated,
  roleMiddleware(managementRoles),
  disableProductController,
);
router.delete(
  '/products/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteProductController,
);

export default router;
