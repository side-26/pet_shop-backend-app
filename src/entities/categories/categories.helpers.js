import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/index.js';

import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

import { CategoryModel } from './categories.model.js';

// ============================================
// REGEX HELPER
// ============================================

const escapeRegex = (value = '') => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ============================================
// CHECK PET TYPE
// ============================================

export const ensurePetTypeExists = async (petTypeId) => {
  const petType = await PetTypeModel.findById(petTypeId);

  if (!petType) {
    setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
      message: 'نوع حیوان انتخاب شده معتبر نیست',
      code: 'PET_TYPE_NOT_FOUND',
    });
  }

  return petType;
};

// ============================================
// CHECK CATEGORY DUPLICATION
// ============================================

export const doesCategoryExist = async ({ title, petType, excludeId } = {}) => {
  const query = {};

  if (title) {
    query.title = {
      $regex: `^${escapeRegex(title)}$`,
      $options: 'i',
    };
  }

  if (petType) {
    query.petType = petType;
  }

  if (excludeId) {
    query._id = {
      $ne: excludeId,
    };
  }

  return CategoryModel.findOne(query);
};

// ============================================
// GET CATEGORY BY ID
// ============================================

export const getCategoryById = async (categoryId, throwOnNotFound = true) => {
  const category = await CategoryModel.findById(categoryId);

  if (!category && throwOnNotFound) {
    setErrorResponse(STATUES.NOT_FOUND, {
      message: 'دسته‌بندی یافت نشد',
      code: 'CATEGORY_NOT_FOUND',
    });
  }

  return category;
};

// ============================================
// CREATE CATEGORY
// ============================================

export const createCategory = async (data, userId) => {
  await ensurePetTypeExists(data.petType);

  const existingCategory = await doesCategoryExist({
    title: data.title,
    petType: data.petType,
  });

  if (existingCategory) {
    setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
      message:
        'دسته‌بندی با این عنوان برای نوع حیوان انتخاب شده قبلاً ثبت شده است',
      code: 'CATEGORY_ALREADY_EXISTS',
    });
  }

  const category = new CategoryModel({
    ...data,
    enable: data.enable ?? true,
    createdBy: userId,
  });

  return category.save();
};

// ============================================
// UPDATE CATEGORY
// ============================================

export const updateCategory = async (categoryId, data, userId) => {
  const currentCategory = await getCategoryById(categoryId);

  await ensurePetTypeExists(data.petType);

  const existingCategory = await doesCategoryExist({
    title: data.title,
    petType: data.petType,
    excludeId: categoryId,
  });

  if (existingCategory) {
    setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
      message:
        'دسته‌بندی با این عنوان برای نوع حیوان انتخاب شده قبلاً ثبت شده است',
      code: 'CATEGORY_ALREADY_EXISTS',
    });
  }

  return CategoryModel.findByIdAndUpdate(
    currentCategory._id,
    {
      $set: {
        ...data,
        updatedBy: userId,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

// ============================================
// ENABLE / DISABLE
// ============================================

export const setCategoryEnableStatus = async (categoryId, enable, userId) => {
  await getCategoryById(categoryId);

  return CategoryModel.findByIdAndUpdate(
    categoryId,
    {
      $set: {
        enable,
        updatedBy: userId,
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

export const deleteCategoryById = async (categoryId) => {
  const category = await CategoryModel.findByIdAndDelete(categoryId);

  if (!category) {
    setErrorResponse(STATUES.NOT_FOUND, {
      message: 'دسته‌بندی یافت نشد',
      code: 'CATEGORY_NOT_FOUND',
    });
  }

  return category;
};

// ============================================
// GET ALL
// ============================================

export const getAllCategories = async ({
  includeDisabled = false,
  petType,
} = {}) => {
  const query = {};

  if (!includeDisabled) {
    query.enable = true;
  }

  if (petType) {
    query.petType = petType;
  }

  return CategoryModel.find(query).sort({
    createdAt: 1,
  });
};

// ============================================
// RESPONSE FORMATTER
// ============================================

export const formatCategoryResponse = (category) => {
  if (!category) {
    return null;
  }

  const value =
    typeof category.toObject === 'function' ? category.toObject() : category;

  return {
    id: value._id,
    title: value.title,
    petType: value.petType,
    enable: value.enable,
    createdBy: value.createdBy,
    updatedBy: value.updatedBy,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

export const formatCategoriesResponse = (categories) => {
  return categories.map(formatCategoryResponse);
};
