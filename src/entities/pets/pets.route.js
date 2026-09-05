import express from 'express';

import { MANAGEMENT_ROLES, ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import {
  uploadPetCreateImages,
  uploadPetUpdateImages,
} from '#middlewares/upload.middleware.js';

import {
  createPetController,
  deletePetController,
  disablePetController,
  enablePetController,
  getCustomerPetPaginateController,
  getCustomerPetController,
  getCustomerPetListController,
  getManagementPetController,
  getManagementPetListController,
  getPetBaseInfoController,
  getPetImagesController,
  getPetPriceController,
  updatePetImagesController,
  updatePetPriceController,
  updatePetController,
} from './pets.controller.js';

const router = express.Router();

router.get(
  '/pets',
  /* #swagger.responses[200] = { description: 'Paginated customer pet list', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } */
  getCustomerPetListController,
);
router.get(
  '/pets/customer/paginate',
  /* #swagger.parameters['title'] = { in: 'query', type: 'string' }
     #swagger.parameters['petType'] = { in: 'query', type: 'string' }
     #swagger.parameters['breed'] = { in: 'query', type: 'string' }
     #swagger.parameters['priceRange'] = { in: 'query', type: 'string', pattern: '^\\d+(?:\\.\\d+)?-\\d+(?:\\.\\d+)?$', description: 'Inclusive MIN-MAX price range' }
     #swagger.responses[200] = { description: 'Paginated customer pet list', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } */
  getCustomerPetPaginateController,
);
router.get('/pets/customer/:id', getCustomerPetController);
router.get(
  '/pets/paginate',
  /* #swagger.parameters['title'] = { in: 'query', type: 'string' }
     #swagger.parameters['petType'] = { in: 'query', type: 'string' }
     #swagger.parameters['breed'] = { in: 'query', type: 'string' }
     #swagger.parameters['quantity'] = { in: 'query', type: 'integer', minimum: 0 }
     #swagger.parameters['isEnable'] = { in: 'query', type: 'boolean' }
     #swagger.responses[200] = { description: 'Paginated management pet list. Each result includes the management-only salesVolume counter.', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getManagementPetListController,
);
router.get(
  '/pets/manage/:id',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getManagementPetController,
);
router.get(
  '/pets/:id/images',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getPetImagesController,
);
router.get(
  '/pets/:id/price',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getPetPriceController,
);
router.get(
  '/pets/:id/base-info',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getPetBaseInfoController,
);
router.post(
  '/pets',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/PetMainImageCreateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadPetCreateImages,
  createPetController,
);
router.put(
  '/pets/:id',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/PetBaseInfoUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  updatePetController,
);
router.put(
  '/pets/:id/images',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/PetImagesUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadPetUpdateImages,
  updatePetImagesController,
);
router.put(
  '/pets/:id/price',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/PetPriceUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  updatePetPriceController,
);
router.patch(
  '/pets/:id/enable',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  enablePetController,
);
router.patch(
  '/pets/:id/disable',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  disablePetController,
);
router.delete(
  '/pets/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deletePetController,
);

export default router;
