import { STATUES } from '#configs/constants.js';
import { MainImageService } from '#services/mainImage.service.js';
import { setErrorResponse } from '#utils/helpers.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

import { CategoryModel } from './categories.model.js';
import { escapeCategoryRegex } from './categories.helpers.js';

export class CategoryService {
  static escapeRegex(value = '') {
    return escapeCategoryRegex(value);
  }

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

  static async create(data, userId, imageFile) {
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

    const uploadedImage = await MainImageService.upload(
      imageFile,
      'categories/main',
    );
    try {
      const category = new CategoryModel({
        ...data,
        mainImage: uploadedImage.mainImage,
        mainThumbnailImage: uploadedImage.mainImageThumbnail,
        isEnable: data.isEnable ?? true,
        createdBy: userId,
      });
      return await category.save();
    } catch (error) {
      await MainImageService.cleanup(uploadedImage.key, { userId });
      throw error;
    }
  }

  static async update(categoryId, data, userId, imageFile) {
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

    const uploadedImage = await MainImageService.upload(
      imageFile,
      'categories/main',
    );
    const previousKey = MainImageService.getStoredKey(
      currentCategory.mainImage,
      {
        id: categoryId,
        userId,
      },
    );
    let updatedCategory;
    try {
      updatedCategory = await CategoryModel.findByIdAndUpdate(
        currentCategory._id,

        {
          $set: {
            ...data,
            mainImage: uploadedImage.mainImage,
            mainThumbnailImage: uploadedImage.mainImageThumbnail,

            updatedBy: userId,
          },
        },

        {
          returnDocument: 'after',

          runValidators: true,
        },
      );
    } catch (error) {
      await MainImageService.cleanup(uploadedImage.key, {
        id: categoryId,
        userId,
      });
      throw error;
    }

    if (!updatedCategory) {
      await MainImageService.cleanup(uploadedImage.key, {
        id: categoryId,
        userId,
      });
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'دسته‌بندی یافت نشد',

        code: 'CATEGORY_NOT_FOUND',
      });
    }

    await MainImageService.cleanup(previousKey, { id: categoryId, userId });

    return updatedCategory;
  }

  static async setEnableStatus(categoryId, isEnable, userId) {
    await this.findById(categoryId);

    const category = await CategoryModel.findByIdAndUpdate(
      categoryId,

      {
        $set: {
          isEnable,

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

  static async enable(categoryId, userId) {
    return this.setEnableStatus(categoryId, true, userId);
  }

  static async disable(categoryId, userId) {
    return this.setEnableStatus(categoryId, false, userId);
  }

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

  static async findAll({ includeDisabled = false, petType } = {}) {
    const query = {};

    if (!includeDisabled) {
      query.isEnable = true;
    }

    if (petType) {
      query.petType = petType;
    }

    return CategoryModel.find(query).sort({
      createdAt: 1,
    });
  }

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

      mainImage: value.mainImage,
      mainThumbnailImage: value.mainThumbnailImage,
      slug: value.slug,
      isEnable: value.isEnable,

      createdBy: value.createdBy,

      updatedBy: value.updatedBy,

      createdAt: value.createdAt,

      updatedAt: value.updatedAt,
    };
  }

  static formatMany(categories) {
    return categories.map((category) => this.format(category));
  }
}
