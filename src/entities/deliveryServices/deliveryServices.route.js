import express from 'express';

import { MANAGEMENT_ROLES } from '#configs/constants.js';
import { RateLimiter } from '#infrastructure/redis/rateLimit/rateLimit.core.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createDeliveryServiceController,
  deleteDeliveryServiceController,
  disableDeliveryServiceController,
  enableDeliveryServiceController,
  getAvailableDeliveryServicesController,
  getAllDeliveryServicesController,
  getDeliveryServiceByIdController,
  updateDeliveryServiceController,
} from './deliveryServices.controller.js';
import { DELIVERY_SERVICE_ROUTES } from './route.path.js';

const router = express.Router();
new RateLimiter('delivery-services').applyTo(router);

router.get(
  DELIVERY_SERVICE_ROUTES.deliveryServicesAvailable,
  /* #swagger.parameters['lat'] = { in: 'query', required: true, schema: { type: 'number' } }
     #swagger.parameters['lng'] = { in: 'query', required: true, schema: { type: 'number' } } */
  getAvailableDeliveryServicesController,
);

router.get(
  DELIVERY_SERVICE_ROUTES.deliveryServices,
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getAllDeliveryServicesController,
);
router.get(
  DELIVERY_SERVICE_ROUTES.deliveryServicesById,
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getDeliveryServiceByIdController,
);
router.post(
  DELIVERY_SERVICE_ROUTES.deliveryServices,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/DeliveryServiceBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  createDeliveryServiceController,
);
router.put(
  DELIVERY_SERVICE_ROUTES.deliveryServicesById,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/DeliveryServiceBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  updateDeliveryServiceController,
);
router.patch(
  DELIVERY_SERVICE_ROUTES.deliveryServicesByIdEnable,
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  enableDeliveryServiceController,
);
router.patch(
  DELIVERY_SERVICE_ROUTES.deliveryServicesByIdDisable,
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  disableDeliveryServiceController,
);
router.delete(
  DELIVERY_SERVICE_ROUTES.deliveryServicesById,
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  deleteDeliveryServiceController,
);

export default router;
