import { STATUES } from '#configs/constants.js';
import { MainImageService } from '#services/mainImage.service.js';
import { setErrorResponse } from '#utils/helpers.js';

import { PetTypeModel } from './petTypes.model.js';
import { PetTypeCacheStore } from './petTypes.cache.store.js';

const petTypeCacheStore = new PetTypeCacheStore();

export class PetTypeService {
  static escapeRegex(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static async findOne(filter = {}) {
    const query = {
      ...filter,
    };

    if (filter.title) {
      query.title = {
        $regex: `^${this.escapeRegex(filter.title)}$`,
        $options: 'i',
      };
    }

    return PetTypeModel.findOne(query);
  }

  static async findById(id, throwOnNotFound = true) {
    const petType = await petTypeCacheStore.getOrLoad(
      PetTypeCacheStore.getByIdLabel(id),
      () => PetTypeModel.findById(id),
    );

    if (!petType && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نوع حیوان یافت نشد',
        code: 'PET_TYPE_NOT_FOUND',
      });
    }

    return petType;
  }

  static async findBySlug(slug, throwOnNotFound = true) {
    const petType = await petTypeCacheStore.getOrLoad(
      PetTypeCacheStore.getBySlugLabel(slug),
      () => PetTypeModel.findBySlug(slug),
    );

    if (!petType && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نوع حیوان یافت نشد',
        code: 'PET_TYPE_NOT_FOUND',
      });
    }

    return petType;
  }

  static async findAll(includeDisabled = false) {
    const query = includeDisabled
      ? {}
      : {
          isEnabled: true,
        };

    return petTypeCacheStore.getOrLoad(
      PetTypeCacheStore.getAllLabel(includeDisabled),
      () =>
        PetTypeModel.find(query).sort({
          createdAt: 1,
        }),
    );
  }

  static async create(data, userId, imageFile) {
    const existingPetType = await this.findOne({
      title: data.title,
    });

    if (existingPetType) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: `نوع حیوان "${data.title}" قبلاً ثبت شده است`,
        code: 'PET_TYPE_ALREADY_EXISTS',
      });
    }

    const uploadedImage = await MainImageService.upload(
      imageFile,
      'pet-types/main',
    );
    let createdPetType;
    try {
      const petType = new PetTypeModel({
        ...data,
        mainImage: uploadedImage.mainImage,
        thumbnail: uploadedImage.mainImageThumbnail,
        createdBy: userId,
      });
      createdPetType = await petType.save();
    } catch (error) {
      await MainImageService.cleanup(uploadedImage.key, { userId });
      throw error;
    }

    await petTypeCacheStore.invalidate(createdPetType);

    return createdPetType;
  }

  static async update(id, data, userId, imageFile) {
    const petType = await PetTypeModel.findById(id);

    if (!petType) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نوع حیوان یافت نشد',
        code: 'PET_TYPE_NOT_FOUND',
      });
    }

    if (data.title) {
      const existingPetType = await this.findOne({
        title: data.title,
      });

      if (existingPetType && existingPetType._id.toString() !== id.toString()) {
        setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
          message: `نوع حیوان "${data.title}" قبلاً ثبت شده است`,
          code: 'PET_TYPE_ALREADY_EXISTS',
        });
      }
    }

    const uploadedImage = await MainImageService.upload(
      imageFile,
      'pet-types/main',
    );
    const previousKey = MainImageService.getStoredKey(petType.mainImage, {
      id,
      userId,
    });

    Object.assign(petType, data, {
      mainImage: uploadedImage.mainImage,
      thumbnail: uploadedImage.mainImageThumbnail,
    });

    petType.updatedBy = userId;

    let updatedPetType;
    try {
      updatedPetType = await petType.save();
    } catch (error) {
      await MainImageService.cleanup(uploadedImage.key, { id, userId });
      throw error;
    }

    await MainImageService.cleanup(previousKey, { id, userId });

    await petTypeCacheStore.invalidate(updatedPetType);

    return updatedPetType;
  }

  static async disable(id, userId) {
    const petType = await PetTypeModel.findById(id);

    if (!petType) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نوع حیوان یافت نشد',
        code: 'PET_TYPE_NOT_FOUND',
      });
    }

    petType.isEnabled = false;
    petType.updatedBy = userId;

    const disabledPetType = await petType.save();

    await petTypeCacheStore.invalidate(disabledPetType);

    return disabledPetType;
  }

  static async enable(id, userId) {
    const petType = await PetTypeModel.findById(id);

    if (!petType) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نوع حیوان یافت نشد',
        code: 'PET_TYPE_NOT_FOUND',
      });
    }

    petType.isEnabled = true;
    petType.updatedBy = userId;

    const enabledPetType = await petType.save();

    await petTypeCacheStore.invalidate(enabledPetType);

    return enabledPetType;
  }

  static async delete(id) {
    const petType = await PetTypeModel.findByIdAndDelete(id);

    if (!petType) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نوع حیوان یافت نشد',
        code: 'PET_TYPE_NOT_FOUND',
      });
    }

    await petTypeCacheStore.invalidate(petType);

    return petType;
  }

  static format(petType) {
    if (!petType) {
      return null;
    }

    return {
      id: petType._id,
      title: petType.title,
      description: petType.description,
      mainImage: petType.mainImage,
      thumbnail: petType.thumbnail,
      isEnabled: petType.isEnabled,
      propertyDefinitions: petType.propertyDefinitions || [],
      slug: petType.slug,
      createdAt: petType.createdAt,
      updatedAt: petType.updatedAt,
    };
  }

  static formatMany(petTypes) {
    return petTypes.map((petType) => this.format(petType));
  }
}
