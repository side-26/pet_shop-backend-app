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

const router = express.Router();

// ============================================
// CREATE
// ============================================

router.post(
  '/categories',
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
  '/categories/:id',
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
