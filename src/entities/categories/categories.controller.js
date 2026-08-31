// src/entities/categories/categories.controller.js

import { STATUES } from '#configs/constants.js';

import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  categoryIdSchema,
  categoryMainImageZodSchema,
  categoryQuerySchema,
  createCategoryZodSchema,
  updateCategoryZodSchema,
} from './categories.schema.js';

import { CategoryService } from './categories.service.js';

// ============================================
// CREATE
// ============================================

export const createCategoryController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createCategoryZodSchema, req.body);
    returnFormValidation(categoryMainImageZodSchema, {
      mimetype: req.file?.mimetype,
      imageFileSize: req.file?.size,
    });

    const category = await CategoryService.create(body, req.user?.id, req.file);

    setSuccessResponse(res, STATUES.CREATED, {
      message: `دسته‌بندی "${category.title}" با موفقیت ایجاد شد`,
      data: CategoryService.format(category),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// UPDATE
// ============================================

export const updateCategoryController = async (req, res, next) => {
  try {
    const params = returnFormValidation(categoryIdSchema, req.params);

    const body = returnFormValidation(updateCategoryZodSchema, req.body);
    returnFormValidation(categoryMainImageZodSchema, {
      mimetype: req.file?.mimetype,
      imageFileSize: req.file?.size,
    });

    const category = await CategoryService.update(
      params.id,
      body,
      req.user?.id,
      req.file,
    );

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `دسته‌بندی "${category.title}" با موفقیت ویرایش شد`,
      data: CategoryService.format(category),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// DELETE BY ID
// ============================================

export const deleteCategoryByIdController = async (req, res, next) => {
  try {
    const params = returnFormValidation(categoryIdSchema, req.params);

    const category = await CategoryService.delete(params.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `دسته‌بندی "${category.title}" با موفقیت حذف شد`,
      data: {
        id: category._id,
      },
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// ENABLE BY ID
// ============================================

export const enableCategoryByIdController = async (req, res, next) => {
  try {
    const params = returnFormValidation(categoryIdSchema, req.params);

    const category = await CategoryService.enable(params.id, req.user?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `دسته‌بندی "${category.title}" با موفقیت فعال شد`,
      data: CategoryService.format(category),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// DISABLE BY ID
// ============================================

export const disableCategoryByIdController = async (req, res, next) => {
  try {
    const params = returnFormValidation(categoryIdSchema, req.params);

    const category = await CategoryService.disable(params.id, req.user?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `دسته‌بندی "${category.title}" با موفقیت غیرفعال شد`,
      data: CategoryService.format(category),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// READ ONE BY ID
// ============================================

export const getCategoryByIdController = async (req, res, next) => {
  try {
    const params = returnFormValidation(categoryIdSchema, req.params);

    const category = await CategoryService.findById(params.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: CategoryService.format(category),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// READ ALL
// WITHOUT PAGINATION
// ============================================

export const getAllCategoriesController = async (req, res, next) => {
  try {
    const query = returnFormValidation(categoryQuerySchema, req.query);

    const categories = await CategoryService.findAll({
      includeDisabled: query.includeDisabled,
      petType: query.petType,
    });

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: CategoryService.formatMany(categories),
      totalRecords: categories.length,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};
