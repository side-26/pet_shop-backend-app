import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/index.js';

import { CategoryModel } from '#entities/categories/categories.model.js';

import { SubCategoryModel } from './subCategories.model.js';

// ============================================
// ESCAPE REGEX
// ============================================

const escapeRegex = (value = '') => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ============================================
// CHECK CATEGORY EXISTS
// ============================================

export const ensureCategoryExists = async (categoryID) => {
  const category = await CategoryModel.findById(categoryID);

  if (!category) {
    setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
      message: 'دسته‌بندی انتخاب شده معتبر نیست',
      code: 'CATEGORY_NOT_FOUND',
    });
  }

  return category;
};

// ============================================
// CHECK SUB CATEGORY EXISTS
// ============================================

export const doesSubCategoryExist = async ({
  title,
  categoryID,
  excludeId,
} = {}) => {
  const query = {};

  if (title) {
    query.title = {
      $regex: `^${escapeRegex(title)}$`,
      $options: 'i',
    };
  }

  if (categoryID) {
    query.categoryID = categoryID;
  }

  if (excludeId) {
    query._id = {
      $ne: excludeId,
    };
  }

  return SubCategoryModel.findOne(query);
};

// ============================================
// GET BY ID
// ============================================

export const getSubCategoryById = async (
  subCategoryId,
  throwOnNotFound = true,
) => {
  const subCategory = await SubCategoryModel.findById(subCategoryId);

  if (!subCategory && throwOnNotFound) {
    setErrorResponse(STATUES.NOT_FOUND, {
      message: 'زیر دسته‌بندی یافت نشد',
      code: 'SUB_CATEGORY_NOT_FOUND',
    });
  }

  return subCategory;
};

// ============================================
// CREATE
// ============================================

export const createSubCategory = async (data) => {
  await ensureCategoryExists(data.categoryID);

  const existingSubCategory = await doesSubCategoryExist({
    title: data.title,
    categoryID: data.categoryID,
  });

  if (existingSubCategory) {
    setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
      message:
        'زیر دسته‌بندی با این عنوان برای دسته‌بندی انتخاب شده قبلاً ثبت شده است',
      code: 'SUB_CATEGORY_ALREADY_EXISTS',
    });
  }

  const subCategory = new SubCategoryModel({
    ...data,
  });

  return subCategory.save();
};

// ============================================
// UPDATE
// ============================================

export const updateSubCategory = async (subCategoryId, data) => {
  const currentSubCategory = await getSubCategoryById(subCategoryId);

  await ensureCategoryExists(data.categoryID);

  const existingSubCategory = await doesSubCategoryExist({
    title: data.title,
    categoryID: data.categoryID,
    excludeId: subCategoryId,
  });

  if (existingSubCategory) {
    setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
      message:
        'زیر دسته‌بندی با این عنوان برای دسته‌بندی انتخاب شده قبلاً ثبت شده است',
      code: 'SUB_CATEGORY_ALREADY_EXISTS',
    });
  }

  return SubCategoryModel.findByIdAndUpdate(
    currentSubCategory._id,
    {
      $set: {
        ...data,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

// ============================================
// DELETE
// ============================================

export const deleteSubCategoryById = async (subCategoryId) => {
  const subCategory = await SubCategoryModel.findByIdAndDelete(subCategoryId);

  if (!subCategory) {
    setErrorResponse(STATUES.NOT_FOUND, {
      message: 'زیر دسته‌بندی یافت نشد',
      code: 'SUB_CATEGORY_NOT_FOUND',
    });
  }

  return subCategory;
};

// ============================================
// GET ALL
// WITHOUT PAGINATION
// ============================================

export const getAllSubCategories = async ({ categoryID } = {}) => {
  const query = {};

  if (categoryID) {
    query.categoryID = categoryID;
  }

  return SubCategoryModel.find(query).sort({
    createdAt: 1,
  });
};

// ============================================
// FORMAT RESPONSE
// ============================================

export const formatSubCategoryResponse = (subCategory) => {
  if (!subCategory) {
    return null;
  }

  const value =
    typeof subCategory.toObject === 'function'
      ? subCategory.toObject()
      : subCategory;

  return {
    id: value._id,
    title: value.title,
    categoryID: value.categoryID,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

export const formatSubCategoriesResponse = (subCategories) => {
  return subCategories.map(formatSubCategoryResponse);
};
