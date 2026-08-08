import { STATUES } from '#configs/constants.js';

import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/index.js';

import {
  createSubCategoryZodSchema,
  subCategoryIdSchema,
  subCategoryQuerySchema,
  updateSubCategoryZodSchema,
} from './subCategories.schema.js';

import { SubCategoryService } from './subCategories.service.js';

// ============================================
// CREATE
// ============================================

export const createSubCategoryController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createSubCategoryZodSchema, req.body);

    const subCategory = await SubCategoryService.create(body);

    setSuccessResponse(res, STATUES.CREATED, {
      message: `زیر دسته‌بندی "${subCategory.title}" با موفقیت ایجاد شد`,

      data: SubCategoryService.format(subCategory),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// UPDATE
// ============================================

export const updateSubCategoryController = async (req, res, next) => {
  try {
    const params = returnFormValidation(subCategoryIdSchema, req.params);

    const body = returnFormValidation(updateSubCategoryZodSchema, req.body);

    const subCategory = await SubCategoryService.update(params.id, body);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `زیر دسته‌بندی "${subCategory.title}" با موفقیت ویرایش شد`,

      data: SubCategoryService.format(subCategory),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// DELETE
// ============================================

export const deleteSubCategoryByIdController = async (req, res, next) => {
  try {
    const params = returnFormValidation(subCategoryIdSchema, req.params);

    const subCategory = await SubCategoryService.delete(params.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `زیر دسته‌بندی "${subCategory.title}" با موفقیت حذف شد`,

      data: {
        id: subCategory._id,
      },
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// GET ONE
// ============================================

export const getSubCategoryByIdController = async (req, res, next) => {
  try {
    const params = returnFormValidation(subCategoryIdSchema, req.params);

    const subCategory = await SubCategoryService.findById(params.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: SubCategoryService.format(subCategory),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// GET ALL
// ============================================

export const getAllSubCategoriesController = async (req, res, next) => {
  try {
    const query = returnFormValidation(subCategoryQuerySchema, req.query);

    const subCategories = await SubCategoryService.findAll({
      category: query.category,
    });

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: SubCategoryService.formatMany(subCategories),

      totalRecords: subCategories.length,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};
