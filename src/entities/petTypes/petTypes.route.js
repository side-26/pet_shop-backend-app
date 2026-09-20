// src/entities/petTypes/petTypes.route.js

import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import { uploadPetTypeMainImage } from '#middlewares/upload.middleware.js';

import {
  createPetTypeController,
  getPetTypePropertyDefinitionsController,
  getAllPetTypesController,
  getPetTypeByIdController,
  getPetTypeBySlugController,
  updatePetTypeController,
  replacePetTypePropertyDefinitionsController,
  disablePetTypeController,
  enablePetTypeController,
  deletePetTypeController,
} from './petTypes.controller.js';

import { PET_TYPE_ROUTES } from './route.path.js';

const router = express.Router();

// Public routes
router.get(PET_TYPE_ROUTES.petTypes, getAllPetTypesController);
router.get(
  PET_TYPE_ROUTES.petTypesPropertyDefinitionsById,
  /* #swagger.description = 'Return a pet type property definition list.' */
  getPetTypePropertyDefinitionsController,
);
router.get(PET_TYPE_ROUTES.petTypesById, getPetTypeByIdController);
router.get(PET_TYPE_ROUTES.petTypesSlugBySlug, getPetTypeBySlugController);

// Admin routes
router.put(
  PET_TYPE_ROUTES.petTypesRange,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/PetTypePropertyDefinitionsBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  replacePetTypePropertyDefinitionsController,
);
router.post(
  PET_TYPE_ROUTES.petTypes,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/PetTypeMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadPetTypeMainImage,
  createPetTypeController,
);
router.put(
  PET_TYPE_ROUTES.petTypesById,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/PetTypeUpdateMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadPetTypeMainImage,
  updatePetTypeController,
);
router.patch(
  PET_TYPE_ROUTES.petTypesByIdDisable,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  disablePetTypeController,
);
router.patch(
  PET_TYPE_ROUTES.petTypesByIdEnable,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  enablePetTypeController,
);
router.delete(
  PET_TYPE_ROUTES.petTypesById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deletePetTypeController,
);

export default router;
