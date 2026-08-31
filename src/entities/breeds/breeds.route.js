import express from 'express';

import { ROLES } from '#configs/constants.js';
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

const router = express.Router();

router.get(
  '/breeds/property-definitions/:id',
  getBreedPropertyDefinitionsController,
);
router.get('/breeds/slug/:slug', getBreedBySlugController);
router.put(
  '/breeds/range',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/BreedPropertyDefinitionsBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  replaceBreedPropertyDefinitionsController,
);

router.get(
  '/breeds/paginate',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['title'] = { in: 'query', description: 'Case-insensitive breed title filter', type: 'string' }
     #swagger.parameters['petType'] = { in: 'query', description: 'Pet type identifier', type: 'string' }
     #swagger.parameters['country'] = { in: 'query', description: 'Case-insensitive country filter', type: 'string' }
     #swagger.parameters['size'] = { in: 'query', description: 'Breed size level (0 to 4)', type: 'integer' }
     #swagger.parameters['activityLevel'] = { in: 'query', description: 'Breed activity level (0 to 4)', type: 'integer' } */
  authenticated,
  roleMiddleware([ROLES.ADMIN, ROLES.SELLER]),
  getAllBreedsWithPaginationController,
);
router.get(
  '/breeds',
  authenticated,
  roleMiddleware([ROLES.ADMIN, ROLES.SELLER]),
  getAllBreedsController,
);
router.get(
  '/breeds/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getBreedController,
);
router.post(
  '/breeds',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/BreedMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadBreedMainImage,
  createBreedController,
);
router.put(
  '/breeds/:id',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/BreedMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadBreedMainImage,
  updateBreedController,
);
router.patch(
  '/breeds/:id/enable',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  enableBreedController,
);
router.patch(
  '/breeds/:id/disable',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  disableBreedController,
);
router.delete(
  '/breeds/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteBreedController,
);

export default router;
