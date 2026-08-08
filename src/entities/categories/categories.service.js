import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/index.js';

import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

import { CategoryModel } from './categories.model.js';

export class CategoryService {
  // =========================================================
  // INTERNAL HELPER
  // =========================================================

  static escapeRegex(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // =========================================================
  // CHECK PET TYPE
  // =========================================================

  static async ensurePetTypeExists(petTypeId) {
    const petType = await PetTypeModel.findById(petTypeId);

    if (!petType) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'نوع حیوان انتخاب شده معتبر نیست',

        code: 'PET_TYPE_NOT_FOUND',
      });
    }

    return petType;
  }

  // =========================================================
  // FIND ONE
  // =========================================================

  static async findOne({ title, petType, excludeId } = {}) {
    const query = {};

    if (title) {
      query.title = {
        $regex: `^${this.escapeRegex(title)}$`,

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
  }

  // =========================================================
  // FIND BY ID
  // =========================================================

  static async findById(categoryId, throwOnNotFound = true) {
    if (!categoryId) {
      setErrorResponse(STATUES.BAD_REQUEST, {
        message: 'شناسه دسته‌بندی معتبر نیست',

        code: 'INVALID_CATEGORY_ID',
      });
    }

    const category = await CategoryModel.findById(categoryId);

    if (!category && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'دسته‌بندی یافت نشد',

        code: 'CATEGORY_NOT_FOUND',
      });
    }

    return category;
  }

  // =========================================================
  // CREATE
  // =========================================================

  static async create(data, userId) {
    await this.ensurePetTypeExists(data.petType);

    const existingCategory = await this.findOne({
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
  }

  // =========================================================
  // UPDATE
  // =========================================================

  static async update(categoryId, data, userId) {
    const currentCategory = await this.findById(categoryId);

    await this.ensurePetTypeExists(data.petType);

    const existingCategory = await this.findOne({
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

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      currentCategory._id,

      {
        $set: {
          ...data,

          updatedBy: userId,
        },
      },

      {
        returnDocument: 'after',

        runValidators: true,
      },
    );

    if (!updatedCategory) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'دسته‌بندی یافت نشد',

        code: 'CATEGORY_NOT_FOUND',
      });
    }

    return updatedCategory;
  }

  // =========================================================
  // SET ENABLE STATUS
  // =========================================================

  static async setEnableStatus(categoryId, enable, userId) {
    await this.findById(categoryId);

    const category = await CategoryModel.findByIdAndUpdate(
      categoryId,

      {
        $set: {
          enable,

          updatedBy: userId,
        },
      },

      {
        returnDocument: 'after',

        runValidators: true,
      },
    );

    if (!category) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'دسته‌بندی یافت نشد',

        code: 'CATEGORY_NOT_FOUND',
      });
    }

    return category;
  }

  // =========================================================
  // ENABLE
  // =========================================================

  static async enable(categoryId, userId) {
    return this.setEnableStatus(categoryId, true, userId);
  }

  // =========================================================
  // DISABLE
  // =========================================================

  static async disable(categoryId, userId) {
    return this.setEnableStatus(categoryId, false, userId);
  }

  // =========================================================
  // DELETE
  // =========================================================

  static async delete(categoryId) {
    const category = await CategoryModel.findByIdAndDelete(categoryId);

    if (!category) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'دسته‌بندی یافت نشد',

        code: 'CATEGORY_NOT_FOUND',
      });
    }

    return category;
  }

  // =========================================================
  // FIND ALL
  // =========================================================

  static async findAll({ includeDisabled = false, petType } = {}) {
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
  }

  // =========================================================
  // FORMAT ONE
  // =========================================================

  static format(category) {
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
  }

  // =========================================================
  // FORMAT MANY
  // =========================================================

  static formatMany(categories) {
    return categories.map((category) => this.format(category));
  }
}
