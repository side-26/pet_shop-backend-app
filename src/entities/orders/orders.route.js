import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createOrderController,
  getOrdersController,
  getUserOrderController,
  getUserOrdersController,
  updateOrderDeliveryStateController,
  updateOrderShippingInfoController,
} from './orders.controller.js';

const router = express.Router();
const managementRoles = [ROLES.ADMIN, ROLES.SELLER];

router.post('/orders', authenticated, createOrderController);
router.get('/orders', authenticated, getUserOrdersController);
router.get(
  '/orders/all',
  authenticated,
  roleMiddleware(managementRoles),
  getOrdersController,
);
router.patch(
  '/orders/:id/delivery-state',
  authenticated,
  roleMiddleware(managementRoles),
  updateOrderDeliveryStateController,
);
router.patch(
  '/orders/:id/shipping-info',
  authenticated,
  roleMiddleware(managementRoles),
  updateOrderShippingInfoController,
);
router.get('/orders/:id', authenticated, getUserOrderController);

export default router;
