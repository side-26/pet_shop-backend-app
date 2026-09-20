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
  updatePetUserRateController,
  updatePetController,
} from './pets.controller.js';

import { PET_ROUTES } from './route.path.js';

const router = express.Router();

router.get(
  PET_ROUTES.pets,
  /* #swagger.responses[200] = { description: 'Paginated customer pet list', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } */
  getCustomerPetListController,
);
router.get(
  PET_ROUTES.petsCustomerPaginate,
  /* #swagger.parameters['title'] = { in: 'query', type: 'string' }
     #swagger.parameters['petType'] = { in: 'query', type: 'string' }
     #swagger.parameters['breed'] = { in: 'query', type: 'string' }
     #swagger.parameters['priceRange'] = { in: 'query', type: 'string', pattern: '^\\d+(?:\\.\\d+)?-\\d+(?:\\.\\d+)?$', description: 'Inclusive MIN-MAX price range' }
     #swagger.responses[200] = { description: 'Paginated customer pet list', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } */
  getCustomerPetPaginateController,
);
router.get(PET_ROUTES.petsCustomerById, getCustomerPetController);
router.patch(
  PET_ROUTES.petsByIdUserRate,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { type: 'object', required: ['userRate'], properties: { userRate: { type: 'number', minimum: 0, maximum: 5, multipleOf: 0.1 } } } } } }
     #swagger.responses[200] = { description: 'Pet rating updated' }
     #swagger.responses[403] = { description: 'A customer can rate only a purchased pet, once' } */
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  updatePetUserRateController,
);
router.get(
  PET_ROUTES.petsPaginate,
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
  PET_ROUTES.petsManageById,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getManagementPetController,
);
router.get(
  PET_ROUTES.petsByIdImages,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getPetImagesController,
);
router.get(
  PET_ROUTES.petsByIdPrice,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getPetPriceController,
);
router.get(
  PET_ROUTES.petsByIdBaseInfo,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getPetBaseInfoController,
);
router.post(
  PET_ROUTES.pets,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/PetMainImageCreateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadPetCreateImages,
  createPetController,
);
router.put(
  PET_ROUTES.petsById,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/PetBaseInfoUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  updatePetController,
);
router.put(
  PET_ROUTES.petsByIdImages,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/PetImagesUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadPetUpdateImages,
  updatePetImagesController,
);
router.put(
  PET_ROUTES.petsByIdPrice,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/PetPriceUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  updatePetPriceController,
);
router.patch(
  PET_ROUTES.petsByIdEnable,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  enablePetController,
);
router.patch(
  PET_ROUTES.petsByIdDisable,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  disablePetController,
);
router.delete(
  PET_ROUTES.petsById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deletePetController,
);

export default router;
