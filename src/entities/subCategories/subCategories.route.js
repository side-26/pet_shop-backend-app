import express from 'express';

import { ROLES } from '#configs/constants.js';

import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createSubCategoryController,
  deleteSubCategoryByIdController,
  getAllSubCategoriesController,
  getSubCategoryByIdController,
  updateSubCategoryController,
} from './subCategories.controller.js';

const router = express.Router();

// ============================================
// CREATE
// ============================================

router.post(
  '/sub-categories',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  createSubCategoryController,
);

// ============================================
// UPDATE
// ============================================

router.put(
  '/sub-categories/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  updateSubCategoryController,
);

// ============================================
// DELETE
// ============================================

router.delete(
  '/sub-categories/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteSubCategoryByIdController,
);

// ============================================
// READ ALL
// ============================================

router.get(
  '/sub-categories',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getAllSubCategoriesController,
);

// ============================================
// READ ONE
// ============================================

router.get(
  '/sub-categories/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getSubCategoryByIdController,
);

export default router;
