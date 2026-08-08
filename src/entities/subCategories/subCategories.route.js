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

router.post(
  '/sub-categories',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  createSubCategoryController,
);

router.put(
  '/sub-categories/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  updateSubCategoryController,
);

router.delete(
  '/sub-categories/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteSubCategoryByIdController,
);

router.get(
  '/sub-categories',
  authenticated,

  getAllSubCategoriesController,
);

router.get(
  '/sub-categories/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  getSubCategoryByIdController,
);

export default router;
