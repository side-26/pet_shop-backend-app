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
        message: 'حیوانی با این عنوان قبلاً ثبت شده است',
        code: ERROR_CODES.PET_ALREADY_EXISTS,
      });
    }
  }

  static async create(data, userId, imageFile, imageFiles = []) {
    await Promise.all([
      this.validateRelations(data.petType, data.breed),
      this.ensureUniqueSlug(data.slug),
    ]);

    const uploadResults = await Promise.allSettled([
      MainImageService.upload(imageFile, 'pets/main'),
      MainImageService.uploadImages(imageFiles, 'pets/images'),
    ]);
    const uploadedMainImage =
      uploadResults[0].status === 'fulfilled' ? uploadResults[0].value : null;
    const uploadedImages =
      uploadResults[1].status === 'fulfilled' ? uploadResults[1].value : [];
    const failedUpload = uploadResults.find(
      (result) => result.status === 'rejected',
    );

    if (failedUpload) {
      await Promise.all([
        MainImageService.cleanup(uploadedMainImage?.key, { userId }),
        MainImageService.cleanupMany(
          uploadedImages.map(({ key }) => key),
          { userId },
        ),
      ]);
      throw failedUpload.reason;
    }

    try {
      return await PetModel.create({
        ...data,
        mainImage: uploadedMainImage.mainImage,
        mainImageThumbnail: uploadedMainImage.mainImageThumbnail,
        images: uploadedImages.map(({ url }) => url),
        createdBy: userId,
      });
    } catch (error) {
      await Promise.all([
        MainImageService.cleanup(uploadedMainImage.key, { userId }),
        MainImageService.cleanupMany(
          uploadedImages.map(({ key }) => key),
          { userId },
        ),
      ]);
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

  static async updateImages(id, data, userId, imageFile, imageFiles = []) {
    if (!imageFile) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'تصویر اصلی باید ارسال شود',
      });
    }
    const currentPet = await this.findById(id);
    const uploadResults = await Promise.allSettled([
      MainImageService.upload(imageFile, 'pets/main'),
      MainImageService.uploadImages(imageFiles, 'pets/images'),
    ]);
    const uploadedMainImage =
      uploadResults[0].status === 'fulfilled' ? uploadResults[0].value : null;
    const uploadedImages =
      uploadResults[1].status === 'fulfilled' ? uploadResults[1].value : [];
    const failedUpload = uploadResults.find(
      (result) => result.status === 'rejected',
    );

    if (failedUpload) {
      await Promise.all([
        MainImageService.cleanup(uploadedMainImage?.key, { id, userId }),
        MainImageService.cleanupMany(
          uploadedImages.map(({ key }) => key),
          { id, userId },
        ),
      ]);
      throw failedUpload.reason;
    }

    const imageData = {
      mainImage: uploadedMainImage.mainImage,
      mainImageThumbnail: uploadedMainImage.mainImageThumbnail,
      images: uploadedImages.map(({ url }) => url),
    };
    let pet;
    try {
      pet = await PetModel.findByIdAndUpdate(
        id,
        { $set: { ...data, ...imageData, updatedBy: userId } },
        { returnDocument: 'after', runValidators: true },
      );
    } catch (error) {
      await Promise.all([
        MainImageService.cleanup(uploadedMainImage.key, { id, userId }),
        MainImageService.cleanupMany(
          uploadedImages.map(({ key }) => key),
          { id, userId },
        ),
      ]);
      throw error;
    }
    if (!pet) {
      await Promise.all([
        MainImageService.cleanup(uploadedMainImage.key, { id, userId }),
        MainImageService.cleanupMany(
          uploadedImages.map(({ key }) => key),
          { id, userId },
        ),
      ]);
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'حیوان یافت نشد',
        code: ERROR_CODES.PET_NOT_FOUND,
      });
    }
    const previousKeys = [
      MainImageService.getStoredKey(currentPet.mainImage, { id, userId }),
      ...(currentPet.images || []).map((imageUrl) =>
        MainImageService.getStoredKey(imageUrl, { id, userId }),
      ),
    ];
    await MainImageService.cleanupMany(previousKeys, { id, userId });
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
    const imageKeys = [
      MainImageService.getStoredKey(pet.mainImage, { id }),
      ...(pet.images || []).map((imageUrl) =>
        MainImageService.getStoredKey(imageUrl, { id }),
      ),
    ];
    await MainImageService.cleanupMany(imageKeys, { id });
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
