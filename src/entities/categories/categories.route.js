import express from 'express';

import { ROLES } from '#configs/constants.js';

import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createCategoryController,
  deleteCategoryByIdController,
  disableCategoryByIdController,
  enableCategoryByIdController,
  getAllCategoriesController,
  getCategoryByIdController,
  updateCategoryController,
} from './categories.controller.js';

const router = express.Router();

// ============================================
// CREATE
// ============================================

router.post(
  '/categories',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  createCategoryController,
);

// ============================================
// UPDATE
// ============================================

router.put(
  '/categories/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  updateCategoryController,
);

// ============================================
// ENABLE
// ============================================

router.put(
  '/categories/enable/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  enableCategoryByIdController,
);

// ============================================
// DISABLE
// ============================================

router.put(
  '/categories/disable/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  disableCategoryByIdController,
);

// ============================================
// DELETE
// ============================================

router.delete(
  '/categories/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteCategoryByIdController,
);

// ============================================
// READ ALL
// ============================================

router.get('/categories', authenticated, getAllCategoriesController);

// ============================================
// READ ONE
// ============================================

router.get(
  '/categories/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getCategoryByIdController,
);

export default router;
