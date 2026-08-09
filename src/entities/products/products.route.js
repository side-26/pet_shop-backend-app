import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createProductController,
  deleteProductController,
  getProductController,
  getProductsController,
  updateProductController,
} from './products.controller.js';

const router = express.Router();

router.get('/products', getProductsController);
router.get('/products/:id', getProductController);
router.post(
  '/products',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  createProductController,
);
router.put(
  '/products/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  updateProductController,
);
router.delete(
  '/products/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteProductController,
);

export default router;
