import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createPetController,
  deletePetController,
  getPetController,
  getPetsController,
  updatePetController,
} from './pet.controller.js';

const router = express.Router();

router.get('/pets', getPetsController);
router.get('/pets/:id', getPetController);
router.post(
  '/pets',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  createPetController,
);
router.put(
  '/pets/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  updatePetController,
);
router.delete(
  '/pets/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deletePetController,
);

export default router;
