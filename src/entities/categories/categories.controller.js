import { STATUES } from '#configs/constants.js';

import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/index.js';

import {
  categoryIdSchema,
  categoryQuerySchema,
  createCategoryZodSchema,
  updateCategoryZodSchema,
} from './categories.schema.js';

import {
  createCategory,
  deleteCategoryById,
  formatCategoriesResponse,
  formatCategoryResponse,
  getAllCategories,
  getCategoryById,
  setCategoryEnableStatus,
  updateCategory,
} from './categories.helpers.js';

// ============================================
// CREATE
// ============================================

export const createCategoryController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createCategoryZodSchema, req.body);

    const category = await createCategory(body, req.user?.id);

    setSuccessResponse(res, STATUES.CREATED, {
      message: `دسته‌بندی "${category.title}" با موفقیت ایجاد شد`,
      data: formatCategoryResponse(category),
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

    const category = await updateCategory(params.id, body, req.user?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `دسته‌بندی "${category.title}" با موفقیت ویرایش شد`,
      data: formatCategoryResponse(category),
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

    const category = await deleteCategoryById(params.id);

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

    const category = await setCategoryEnableStatus(
      params.id,
      true,
      req.user?.id,
    );

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `دسته‌بندی "${category.title}" با موفقیت فعال شد`,
      data: formatCategoryResponse(category),
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

    const category = await setCategoryEnableStatus(
      params.id,
      false,
      req.user?.id,
    );

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `دسته‌بندی "${category.title}" با موفقیت غیرفعال شد`,
      data: formatCategoryResponse(category),
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

    const category = await getCategoryById(params.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: formatCategoryResponse(category),
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

    const categories = await getAllCategories({
      includeDisabled: query.includeDisabled,
      petType: query.petType,
    });

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: formatCategoriesResponse(categories),
      totalRecords: categories.length,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};
