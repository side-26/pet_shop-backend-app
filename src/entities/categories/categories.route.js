import express from 'express';

import { ROLES } from '#configs/constants.js';

import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import { uploadMainImage } from '#middlewares/upload.middleware.js';

import {
  createCategoryController,
  deleteCategoryByIdController,
  disableCategoryByIdController,
  enableCategoryByIdController,
  getAllCategoriesController,
  getCategoryByIdController,
  updateCategoryController,
} from './categories.controller.js';

import { CATEGORY_ROUTES } from './route.path.js';

const router = express.Router();

// ============================================
// CREATE
// ============================================

router.post(
  CATEGORY_ROUTES.categories,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/CategoryMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadMainImage,
  createCategoryController,
);

// ============================================
// UPDATE
// ============================================

router.put(
  CATEGORY_ROUTES.categoriesById,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/CategoryUpdateMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadMainImage,
  updateCategoryController,
);

// ============================================
// ENABLE
// ============================================

router.put(
  CATEGORY_ROUTES.categoriesEnableById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  enableCategoryByIdController,
);

// ============================================
// DISABLE
// ============================================

router.put(
  CATEGORY_ROUTES.categoriesDisableById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  disableCategoryByIdController,
);

// ============================================
// DELETE
// ============================================

router.delete(
  CATEGORY_ROUTES.categoriesById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteCategoryByIdController,
);

// ============================================
// READ ALL
// ============================================

router.get(
  CATEGORY_ROUTES.categories,
  authenticated,
  getAllCategoriesController,
);

// ============================================
// READ ONE
// ============================================

router.get(
  CATEGORY_ROUTES.categoriesById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getCategoryByIdController,
);

export default router;
