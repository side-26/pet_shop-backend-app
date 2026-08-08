import { STATUES } from '#configs/constants.js';

import { setErrorResponse } from '#utils/index.js';

import { CategoryModel } from '#entities/categories/categories.model.js';

import { SubCategoryModel } from './subCategories.model.js';

export class SubCategoryService {
  // ============================================
  // REGEX
  // ============================================

  static escapeRegex(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ============================================
  // CATEGORY EXISTS
  // ============================================

  static async ensureCategoryExists(categoryId) {
    const category = await CategoryModel.findById(categoryId);

    if (!category) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'دسته‌بندی انتخاب شده معتبر نیست',

        code: 'CATEGORY_NOT_FOUND',
      });
    }

    return category;
  }

  // ============================================
  // FIND ONE
  // ============================================

  static async findOne({ title, category, excludeId } = {}) {
    const query = {};

    if (title) {
      query.title = {
        $regex: `^${this.escapeRegex(title)}$`,

        $options: 'i',
      };
    }

    if (category) {
      query.category = category;
    }

    if (excludeId) {
      query._id = {
        $ne: excludeId,
      };
    }

    return SubCategoryModel.findOne(query);
  }

  // ============================================
  // FIND BY ID
  // ============================================

  static async findById(id, throwOnNotFound = true) {
    if (!id) {
      setErrorResponse(STATUES.BAD_REQUEST, {
        message: 'شناسه زیر دسته‌بندی معتبر نیست',

        code: 'INVALID_SUB_CATEGORY_ID',
      });
    }

    const subCategory = await SubCategoryModel.findById(id);

    if (!subCategory && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'زیر دسته‌بندی یافت نشد',

        code: 'SUB_CATEGORY_NOT_FOUND',
      });
    }

    return subCategory;
  }

  // ============================================
  // CREATE
  // ============================================

  static async create(data) {
    await this.ensureCategoryExists(data.category);

    const existing = await this.findOne({
      title: data.title,

      category: data.category,
    });

    if (existing) {
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
  }

  // ============================================
  // UPDATE
  // ============================================

  static async update(id, data) {
    const current = await this.findById(id);

    await this.ensureCategoryExists(data.category);

    const existing = await this.findOne({
      title: data.title,

      category: data.category,

      excludeId: id,
    });

    if (existing) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message:
          'زیر دسته‌بندی با این عنوان برای دسته‌بندی انتخاب شده قبلاً ثبت شده است',

        code: 'SUB_CATEGORY_ALREADY_EXISTS',
      });
    }

    const updated = await SubCategoryModel.findByIdAndUpdate(
      current._id,

      {
        $set: {
          ...data,
        },
      },

      {
        returnDocument: 'after',

        runValidators: true,
      },
    );

    if (!updated) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'زیر دسته‌بندی یافت نشد',

        code: 'SUB_CATEGORY_NOT_FOUND',
      });
    }

    return updated;
  }

  // ============================================
  // DELETE
  // ============================================

  static async delete(id) {
    const subCategory = await SubCategoryModel.findByIdAndDelete(id);

    if (!subCategory) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'زیر دسته‌بندی یافت نشد',

        code: 'SUB_CATEGORY_NOT_FOUND',
      });
    }

    return subCategory;
  }

  // ============================================
  // FIND ALL
  // ============================================

  static async findAll({ category } = {}) {
    const query = {};

    if (category) {
      query.category = category;
    }

    return SubCategoryModel.find(query).sort({
      createdAt: 1,
    });
  }

  // ============================================
  // FORMAT
  // ============================================

  static format(subCategory) {
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

      category: value.category,

      createdAt: value.createdAt,

      updatedAt: value.updatedAt,
    };
  }

  static formatMany(subCategories) {
    return subCategories.map((subCategory) => this.format(subCategory));
  }
}
