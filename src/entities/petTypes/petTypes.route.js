// src/entities/petTypes/petTypes.route.js

import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import { uploadPetTypeMainImage } from '#middlewares/upload.middleware.js';

import {
  createPetTypeController,
  getAllPetTypesController,
  getPetTypeByIdController,
  getPetTypeBySlugController,
  updatePetTypeController,
  disablePetTypeController,
  enablePetTypeController,
  deletePetTypeController,
} from './petTypes.controller.js';

const router = express.Router();

// Public routes
router.get('/pet-types', getAllPetTypesController);
router.get('/pet-types/:id', getPetTypeByIdController);
router.get('/pet-types/slug/:slug', getPetTypeBySlugController);

// Admin routes
router.post(
  '/pet-types',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/PetTypeMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadPetTypeMainImage,
  createPetTypeController,
);
router.put(
  '/pet-types/:id',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/PetTypeMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadPetTypeMainImage,
  updatePetTypeController,
);
router.patch(
  '/pet-types/:id/disable',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  disablePetTypeController,
);
router.patch(
  '/pet-types/:id/enable',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  enablePetTypeController,
);
router.delete(
  '/pet-types/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deletePetTypeController,
);

export default router;
