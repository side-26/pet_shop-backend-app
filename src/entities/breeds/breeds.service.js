import { ERROR_CODES, STATUES } from '#configs/constants.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { MainImageService } from '#services/mainImage.service.js';
import { getPaginationData, setErrorResponse } from '#utils/helpers.js';

import {
  buildBreedFilter,
  escapeBreedRegex,
  formatBreed,
} from './breeds.helpers.js';
import { BreedModel } from './breeds.model.js';

export class BreedService {
  static escapeRegex(value = '') {
    return escapeBreedRegex(value);
  }

  static async findOne({ title, petType, excludeId } = {}) {
    const query = {};
    if (title) {
      query.title = {
        $regex: `^${this.escapeRegex(title)}$`,
        $options: 'i',
      };
    }
    if (excludeId) query._id = { $ne: excludeId };
    if (petType) query.petType = petType;
    return BreedModel.findOne(query);
  }

  static async ensurePetTypeExists(petTypeId) {
    const petType = await PetTypeModel.findById(petTypeId);
    if (!petType) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'نوع حیوان انتخاب‌شده وجود ندارد',
        code: ERROR_CODES.PET_TYPE_NOT_FOUND,
      });
    }
    return petType;
  }

  static async findById(id, throwOnNotFound = true) {
    const breed = await BreedModel.findById(id);
    if (!breed && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نژاد یافت نشد',
        code: ERROR_CODES.BREED_NOT_FOUND,
      });
    }
    return breed;
  }

  static async findBySlug(slug, throwOnNotFound = true) {
    const breed = await BreedModel.findBySlug(slug);
    if (!breed && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نژاد یافت نشد',
        code: ERROR_CODES.BREED_NOT_FOUND,
      });
    }
    return breed;
  }

  static async create(data, userId, imageFile) {
    await this.ensurePetTypeExists(data.petType);
    const existingBreed = await this.findOne({
      title: data.title,
      petType: data.petType,
    });
    if (existingBreed) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'نژادی با این عنوان برای نوع حیوان انتخاب‌شده وجود دارد',
        code: ERROR_CODES.BREED_ALREADY_EXISTS,
      });
    }
    const uploadedImage = await MainImageService.upload(
      imageFile,
      'breeds/main',
    );
    try {
      return await BreedModel.create({
        ...data,
        mainImage: uploadedImage.mainImage,
        thumbnailImage: uploadedImage.mainImageThumbnail,
        createdBy: userId,
      });
    } catch (error) {
      await MainImageService.cleanup(uploadedImage.key, { userId });
      throw error;
    }
  }

  static async update(id, data, userId, imageFile) {
    const currentBreed = await this.findById(id);
    await this.ensurePetTypeExists(data.petType);
    const existingBreed = await this.findOne({
      title: data.title,
      petType: data.petType,
      excludeId: id,
    });
    if (existingBreed) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'نژادی با این عنوان برای نوع حیوان انتخاب‌شده وجود دارد',
        code: ERROR_CODES.BREED_ALREADY_EXISTS,
      });
    }
    const uploadedImage = await MainImageService.upload(
      imageFile,
      'breeds/main',
    );
    const previousKey = MainImageService.getStoredKey(currentBreed.mainImage, {
      id,
      userId,
    });
    let breed;
    try {
      breed = await BreedModel.findByIdAndUpdate(
        id,
        {
          $set: {
            ...data,
            mainImage: uploadedImage.mainImage,
            thumbnailImage: uploadedImage.mainImageThumbnail,
            updatedBy: userId,
          },
        },
        { returnDocument: 'after', runValidators: true },
      );
    } catch (error) {
      await MainImageService.cleanup(uploadedImage.key, { id, userId });
      throw error;
    }

    if (!breed) {
      await MainImageService.cleanup(uploadedImage.key, { id, userId });
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نژاد یافت نشد',
        code: ERROR_CODES.BREED_NOT_FOUND,
      });
    }

    await MainImageService.cleanup(previousKey, { id, userId });
    return breed;
  }

  static async setEnableStatus(id, enable, userId) {
    await this.findById(id);
    const breed = await BreedModel.findByIdAndUpdate(
      id,
      { $set: { enable, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!breed) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نژاد یافت نشد',
        code: ERROR_CODES.BREED_NOT_FOUND,
      });
    }
    return breed;
  }

  static async replacePropertyDefinitions(id, propertyDefinitions, userId) {
    const breed = await this.findById(id);
    breed.propertyDefinitions = propertyDefinitions;
    breed.updatedBy = userId;
    return breed.save();
  }

  static formatPropertyDefinitions(breed) {
    return (breed.propertyDefinitions || []).map(({ label, value }) => ({
      label,
      value,
    }));
  }

  static enable(id, userId) {
    return this.setEnableStatus(id, true, userId);
  }

  static disable(id, userId) {
    return this.setEnableStatus(id, false, userId);
  }

  static async delete(id) {
    const breed = await BreedModel.findByIdAndDelete(id);
    if (!breed) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نژاد یافت نشد',
        code: ERROR_CODES.BREED_NOT_FOUND,
      });
    }
    return breed;
  }

  static findAll(queryParams = {}) {
    return BreedModel.find(buildBreedFilter(queryParams)).sort({ title: 1 });
  }

  static findAllWithPagination(queryParams = {}) {
    const filter = {
      ...buildBreedFilter(queryParams),
      page: queryParams.page,
      limit: queryParams.limit,
      sort: queryParams.sort,
    };
    return getPaginationData(BreedModel, filter, '', (error) =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت فهرست نژادها ناموفق بود',
        error: String(error),
      }),
    );
  }

  static format(breed) {
    return formatBreed(breed);
  }

  static formatMany(breeds) {
    return breeds.map(formatBreed);
  }
}
