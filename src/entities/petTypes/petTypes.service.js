import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/index.js';

import { PetTypeModel } from './petTypes.model.js';

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
    const petType = await PetTypeModel.findById(id);

    if (!petType && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نوع حیوان یافت نشد',
        code: 'PET_TYPE_NOT_FOUND',
      });
    }

    return petType;
  }

  static async findBySlug(slug, throwOnNotFound = true) {
    const petType = await PetTypeModel.findBySlug(slug);

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

    return PetTypeModel.find(query).sort({
      createdAt: 1,
    });
  }

  static async create(data, userId) {
    const existingPetType = await this.findOne({
      title: data.title,
    });

    if (existingPetType) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: `نوع حیوان "${data.title}" قبلاً ثبت شده است`,
        code: 'PET_TYPE_ALREADY_EXISTS',
      });
    }

    const petType = new PetTypeModel({
      ...data,
      createdBy: userId,
    });

    return petType.save();
  }

  static async update(id, data, userId) {
    const petType = await this.findById(id);

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

    Object.assign(petType, data);

    petType.updatedBy = userId;

    return petType.save();
  }

  static async disable(id, userId) {
    const petType = await this.findById(id);

    petType.isEnabled = false;
    petType.updatedBy = userId;

    return petType.save();
  }

  static async enable(id, userId) {
    const petType = await this.findById(id);

    petType.isEnabled = true;
    petType.updatedBy = userId;

    return petType.save();
  }

  static async delete(id) {
    const petType = await PetTypeModel.findByIdAndDelete(id);

    if (!petType) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نوع حیوان یافت نشد',
        code: 'PET_TYPE_NOT_FOUND',
      });
    }

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
      isEnabled: petType.isEnabled,
      slug: petType.slug,
      createdAt: petType.createdAt,
      updatedAt: petType.updatedAt,
    };
  }

  static formatMany(petTypes) {
    return petTypes.map((petType) => this.format(petType));
  }
}
