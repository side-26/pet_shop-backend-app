import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createOrderController,
  deleteOrderController,
  getOrderController,
  getOrdersController,
  updateOrderStatusController,
} from './orders.controller.js';

const router = express.Router();

router.use('/orders', authenticated);
router.get('/orders', getOrdersController);
router.get('/orders/:id', getOrderController);
router.post('/orders', createOrderController);
router.patch(
  '/orders/:id/status',
  roleMiddleware(ROLES.ADMIN),
  updateOrderStatusController,
);
router.delete(
  '/orders/:id',
  roleMiddleware(ROLES.ADMIN),
  deleteOrderController,
);

export default router;
