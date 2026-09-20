import express from 'express';

import { MANAGEMENT_ROLES, ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import { uploadBreedMainImage } from '#middlewares/upload.middleware.js';

import {
  createBreedController,
  deleteBreedController,
  disableBreedController,
  enableBreedController,
  getAllBreedsController,
  getAllBreedsWithPaginationController,
  getBreedController,
  getBreedBySlugController,
  getBreedPropertyDefinitionsController,
  replaceBreedPropertyDefinitionsController,
  updateBreedController,
} from './breeds.controller.js';

import { BREED_ROUTES } from './route.path.js';

const router = express.Router();

router.get(
  BREED_ROUTES.breedsPropertyDefinitionsById,
  getBreedPropertyDefinitionsController,
);
router.get(BREED_ROUTES.breedsSlugBySlug, getBreedBySlugController);
router.put(
  BREED_ROUTES.breedsRange,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/BreedPropertyDefinitionsBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  replaceBreedPropertyDefinitionsController,
);

router.get(
  BREED_ROUTES.breedsPaginate,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['title'] = { in: 'query', description: 'Case-insensitive breed title filter', type: 'string' }
     #swagger.parameters['petType'] = { in: 'query', description: 'Pet type identifier', type: 'string' }
     #swagger.parameters['country'] = { in: 'query', description: 'Case-insensitive country filter', type: 'string' }
     #swagger.parameters['size'] = { in: 'query', description: 'Breed size level (0 to 4)', type: 'integer' }
     #swagger.parameters['activityLevel'] = { in: 'query', description: 'Breed activity level (0 to 4)', type: 'integer' }
     #swagger.responses[200] = { description: 'Paginated breed list', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getAllBreedsWithPaginationController,
);
router.get(
  BREED_ROUTES.breeds,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['petType'] = { in: 'query', description: 'Pet type identifier used to filter breeds', type: 'string' }
     #swagger.responses[200] = { description: 'Breed list filtered by pet type when provided' } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getAllBreedsController,
);
router.get(
  BREED_ROUTES.breedsById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getBreedController,
);
router.post(
  BREED_ROUTES.breeds,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/BreedMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadBreedMainImage,
  createBreedController,
);
router.put(
  BREED_ROUTES.breedsById,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/BreedUpdateMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadBreedMainImage,
  updateBreedController,
);
router.patch(
  BREED_ROUTES.breedsByIdEnable,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  enableBreedController,
);
router.patch(
  BREED_ROUTES.breedsByIdDisable,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  disableBreedController,
);
router.delete(
  BREED_ROUTES.breedsById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteBreedController,
);

export default router;
