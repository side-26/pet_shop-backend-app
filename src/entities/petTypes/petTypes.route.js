import express from 'express';
import {
  createPetTypeController,
  getAllPetTypesController,
  getPetTypeByIdController,
  //   getPetTypeBySlugController,
  updatePetTypeController,
  disablePetTypeController,
  enablePetTypeController,
  deletePetTypeController,
} from './petType.controller.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import { ROLES } from '#configs/constants.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

// Get all pet types
router.get('/pet-types', getAllPetTypesController);

// Get pet type by ID
router.get(
  '/pet-types/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getPetTypeByIdController,
);

// Get pet type by slug
// router.get('/pet-types/slug/:slug', getPetTypeBySlugController);

// ============================================
// ADMIN ROUTES
// ============================================

// Create pet type
router.post(
  '/pet-types',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  createPetTypeController,
);

// Update pet type
router.put(
  '/pet-types/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  updatePetTypeController,
);

// Disable pet type (soft delete)
router.patch(
  '/pet-types/:id/disable',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  disablePetTypeController,
);

// Enable pet type
router.patch(
  '/pet-types/:id/enable',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  enablePetTypeController,
);

// Delete pet type (permanent delete)
router.delete(
  '/pet-types/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deletePetTypeController,
);

export default router;
