import express from 'express';

import { MANAGEMENT_ROLES } from '#configs/constants.js';
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

router.post(
  '/orders',
  authenticated,
  /*
    #swagger.tags = ['Orders']
    #swagger.summary = "Create an order from the authenticated user's cart"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/CreateOrderBody' } } } }
    #swagger.responses[201] = { description: 'Order created' }
    #swagger.responses[422] = { description: 'Cart or payment validation error' }
  */
  createOrderController,
);
router.get(
  '/orders',
  authenticated,
  /*
    #swagger.tags = ['Orders']
    #swagger.summary = "List the authenticated user's orders"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['page'] = { in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }
    #swagger.parameters['limit'] = { in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
    #swagger.responses[200] = { description: 'Paginated user orders', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } }
  */
  getUserOrdersController,
);
router.get(
  '/orders/all',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  /*
    #swagger.tags = ['Orders']
    #swagger.summary = 'List all orders for Admin or Seller'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['page'] = { in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }
    #swagger.parameters['limit'] = { in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
    #swagger.parameters['deliveryState'] = { in: 'query', schema: { type: 'integer', enum: [0, 1, 2, 3] } }
    #swagger.responses[200] = { description: 'Paginated orders', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } }
    #swagger.responses[403] = { description: 'Admin or Seller role required' }
  */
  getOrdersController,
);
router.patch(
  '/orders/:id/delivery-state',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  /*
    #swagger.tags = ['Orders']
    #swagger.summary = 'Update order delivery state'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/UpdateOrderDeliveryStateBody' } } } }
    #swagger.responses[200] = { description: 'Delivery state updated' }
    #swagger.responses[403] = { description: 'Admin or Seller role required' }
    #swagger.responses[404] = { description: 'Order not found' }
  */
  updateOrderDeliveryStateController,
);
router.patch(
  '/orders/:id/shipping-info',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  /*
    #swagger.tags = ['Orders']
    #swagger.summary = 'Update order shipping information'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/UpdateOrderShippingInfoBody' } } } }
    #swagger.responses[200] = { description: 'Shipping information updated' }
    #swagger.responses[403] = { description: 'Admin or Seller role required' }
    #swagger.responses[404] = { description: 'Order not found' }
  */
  updateOrderShippingInfoController,
);
router.get(
  '/orders/:id',
  authenticated,
  /*
    #swagger.tags = ['Orders']
    #swagger.summary = "Get one of the authenticated user's orders"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
    #swagger.responses[200] = { description: 'Owned order', content: { "application/json": { schema: { type: 'object', properties: { isSuccess: { type: 'boolean' }, data: { $ref: '#/components/schemas/Order' } } } } } }
    #swagger.responses[404] = { description: 'Order not found' }
  */
  getUserOrderController,
);

export default router;
