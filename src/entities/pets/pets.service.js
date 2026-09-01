import { ERROR_CODES, STATUES } from '#configs/constants.js';
import { BreedModel } from '#entities/breeds/breeds.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { MainImageService } from '#services/mainImage.service.js';
import { getPaginationData, setErrorResponse } from '#utils/helpers.js';

import {
  buildPetFilter,
  escapePetRegex,
  formatCustomerPetDetail,
  formatCustomerPetListItem,
  formatManagementPet,
  formatPetBaseInfo,
  formatPetImages,
  formatPetPrice,
} from './pets.helpers.js';
import { PetModel } from './pets.model.js';

const populateRelations = async (documents) =>
  PetModel.populate(documents, [{ path: 'petType' }, { path: 'breed' }]);

export class PetService {
  static escapeRegex(value = '') {
    return escapePetRegex(value);
  }

  static async findOne({ slug, excludeId } = {}) {
    const query = {};
    if (slug) query.slug = slug.toLowerCase();
    if (excludeId) query._id = { $ne: excludeId };
    return PetModel.findOne(query);
  }

  static async findById(id, throwOnNotFound = true) {
    const pet = await PetModel.findById(id);
    if (!pet && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'حیوان یافت نشد',
        code: ERROR_CODES.PET_NOT_FOUND,
      });
    }
    return pet;
  }

  static async validateRelations(petTypeId, breedId) {
    const [petType, breed] = await Promise.all([
      PetTypeModel.findById(petTypeId),
      BreedModel.findById(breedId),
    ]);
    if (!petType) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'نوع حیوان انتخاب‌شده وجود ندارد',
        code: ERROR_CODES.PET_TYPE_NOT_FOUND,
      });
    }
    if (!breed) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'نژاد انتخاب‌شده وجود ندارد',
        code: ERROR_CODES.PET_BREED_NOT_FOUND,
      });
    }
    if (breed.petType?.toString() !== petType._id.toString()) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'نژاد انتخاب‌شده متعلق به نوع حیوان انتخاب‌شده نیست',
        code: ERROR_CODES.PET_BREED_TYPE_MISMATCH,
      });
    }
    return { petType, breed };
  }

  static async ensureUniqueSlug(slug, excludeId) {
    const existingPet = await this.findOne({ slug, excludeId });
    if (existingPet) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'حیوانی با این نامک قبلاً ثبت شده است',
        code: ERROR_CODES.PET_ALREADY_EXISTS,
      });
    }
  }

  static async create(data, userId, imageFile) {
    await Promise.all([
      this.validateRelations(data.petType, data.breed),
      this.ensureUniqueSlug(data.slug),
    ]);
    const uploadedImage = await MainImageService.upload(imageFile, 'pets/main');
    try {
      return await PetModel.create({
        ...data,
        mainImage: uploadedImage.mainImage,
        mainImageThumbnail: uploadedImage.mainImageThumbnail,
        createdBy: userId,
      });
    } catch (error) {
      await MainImageService.cleanup(uploadedImage.key, { userId });
      throw error;
    }
  }

  static async updateBaseInfo(id, data, userId) {
    const currentPet = await this.findById(id);
    const petTypeId = data.petType || currentPet.petType;
    const breedId = data.breed || currentPet.breed;
    await this.validateRelations(petTypeId, breedId);
    const pet = await PetModel.findByIdAndUpdate(
      id,
      { $set: { ...data, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!pet) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'حیوان یافت نشد',
        code: ERROR_CODES.PET_NOT_FOUND,
      });
    }
    return pet;
  }

  static async updateImages(id, data, userId, imageFile) {
    if (!imageFile && !Object.prototype.hasOwnProperty.call(data, 'images')) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'حداقل یک تصویر باید ارسال شود',
      });
    }
    const currentPet = await this.findById(id);
    const uploadedImage = imageFile
      ? await MainImageService.upload(imageFile, 'pets/main')
      : null;
    const imageData = uploadedImage
      ? {
          mainImage: uploadedImage.mainImage,
          mainImageThumbnail: uploadedImage.mainImageThumbnail,
        }
      : {};
    let pet;
    try {
      pet = await PetModel.findByIdAndUpdate(
        id,
        { $set: { ...data, ...imageData, updatedBy: userId } },
        { returnDocument: 'after', runValidators: true },
      );
    } catch (error) {
      await MainImageService.cleanup(uploadedImage?.key, { id, userId });
      throw error;
    }
    if (!pet) {
      await MainImageService.cleanup(uploadedImage?.key, { id, userId });
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'حیوان یافت نشد',
        code: ERROR_CODES.PET_NOT_FOUND,
      });
    }
    if (uploadedImage) {
      const previousKey = MainImageService.getStoredKey(currentPet.mainImage, {
        id,
        userId,
      });
      await MainImageService.cleanup(previousKey, { id, userId });
    }
    return pet;
  }

  static async updatePrice(id, data, userId) {
    await this.findById(id);
    const pet = await PetModel.findByIdAndUpdate(
      id,
      { $set: { ...data, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!pet) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'حیوان یافت نشد',
        code: ERROR_CODES.PET_NOT_FOUND,
      });
    }
    return pet;
  }

  static async setEnableStatus(id, inEnable, userId) {
    await this.findById(id);
    const pet = await PetModel.findByIdAndUpdate(
      id,
      { $set: { inEnable, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!pet) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'حیوان یافت نشد',
        code: ERROR_CODES.PET_NOT_FOUND,
      });
    }
    return pet;
  }

  static enable(id, userId) {
    return this.setEnableStatus(id, true, userId);
  }

  static disable(id, userId) {
    return this.setEnableStatus(id, false, userId);
  }

  static async delete(id) {
    const pet = await PetModel.findByIdAndDelete(id);
    if (!pet) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'حیوان یافت نشد',
        code: ERROR_CODES.PET_NOT_FOUND,
      });
    }
    return pet;
  }

  static async findManagementById(id) {
    const pet = await this.findById(id);
    return populateRelations(pet);
  }

  static findImagesById(id) {
    return this.findById(id);
  }

  static findPriceById(id) {
    return this.findById(id);
  }

  static async findBaseInfoById(id) {
    const pet = await this.findById(id);
    return populateRelations(pet);
  }

  static async findManagementList(queryParams = {}) {
    const filter = {
      ...buildPetFilter(queryParams),
      page: queryParams.page,
      limit: queryParams.limit,
      sort: queryParams.sort,
    };
    const result = await getPaginationData(PetModel, filter, '', (error) =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت فهرست حیوانات ناموفق بود',
        error: String(error),
      }),
    );
    result.result = await populateRelations(result.result);
    return result;
  }

  static async findCustomerList(queryParams = {}) {
    const filter = {
      ...buildPetFilter(queryParams, true),
      page: queryParams.page,
      limit: queryParams.limit,
      sort: queryParams.sort,
    };
    const result = await getPaginationData(PetModel, filter, '', (error) =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت فهرست حیوانات ناموفق بود',
        error: String(error),
      }),
    );
    result.result = await populateRelations(result.result);
    return result;
  }

  static async findCustomerById(id) {
    const pet = await PetModel.findOne({ _id: id, inEnable: true });
    if (!pet) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'حیوان یافت نشد',
        code: ERROR_CODES.PET_NOT_FOUND,
      });
    }
    return populateRelations(pet);
  }

  static formatManagement(pet) {
    return formatManagementPet(pet);
  }

  static formatManagementMany(pets) {
    return pets.map(formatManagementPet);
  }

  static formatCustomerList(pets) {
    return pets.map(formatCustomerPetListItem);
  }

  static formatCustomerDetail(pet) {
    return formatCustomerPetDetail(pet);
  }

  static formatCustomerDetails(pets) {
    return pets.map(formatCustomerPetDetail);
  }

  static formatImages(pet) {
    return formatPetImages(pet);
  }

  static formatPrice(pet) {
    return formatPetPrice(pet);
  }

  static formatBaseInfo(pet) {
    return formatPetBaseInfo(pet);
  }
}
