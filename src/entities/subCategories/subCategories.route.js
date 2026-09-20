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

import { SUB_CATEGORY_ROUTES } from './route.path.js';

const router = express.Router();

router.post(
  SUB_CATEGORY_ROUTES.subCategories,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  createSubCategoryController,
);

router.put(
  SUB_CATEGORY_ROUTES.subCategoriesById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  updateSubCategoryController,
);

router.delete(
  SUB_CATEGORY_ROUTES.subCategoriesById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteSubCategoryByIdController,
);

router.get(
  SUB_CATEGORY_ROUTES.subCategories,
  authenticated,

  getAllSubCategoriesController,
);

router.get(
  SUB_CATEGORY_ROUTES.subCategoriesById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getSubCategoryByIdController,
);

export default router;
