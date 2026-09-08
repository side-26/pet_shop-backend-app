import { STATUES } from '#configs/constants.js';
import { MainImageService } from '#services/mainImage.service.js';
import { assertEntityIsNotReferenced } from '#services/referenceGuard.service.js';
import { setErrorResponse } from '#utils/helpers.js';

import { BrandModel } from './brands.model.js';

export class BrandService {
  static escapeRegex(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static async findOne({ title } = {}) {
    const query = title
      ? { title: { $regex: `^${this.escapeRegex(title)}$`, $options: 'i' } }
      : {};
    return BrandModel.findOne(query);
  }

  static async findById(id, throwOnNotFound = true) {
    const brand = await BrandModel.findById(id);
    if (!brand && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'برند یافت نشد',
        code: 'BRAND_NOT_FOUND',
      });
    }
    return brand;
  }

  static async create(data, userId, logoFile) {
    const existingBrand = await this.findOne({ title: data.title });
    if (existingBrand) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: `برند "${data.title}" قبلاً ثبت شده است`,
        code: 'BRAND_ALREADY_EXISTS',
      });
    }

    const uploadedLogo = logoFile
      ? await MainImageService.upload(logoFile, 'brands/logos')
      : null;
    try {
      return await new BrandModel({
        ...data,
        logo: uploadedLogo?.mainImage,
        thumbnailLogo: uploadedLogo?.mainImageThumbnail,
        createdBy: userId,
      }).save();
    } catch (error) {
      await MainImageService.cleanup(uploadedLogo?.key, { userId });
      throw error;
    }
  }

  static async setEnableStatus(id, isEnable, userId) {
    const brand = await this.findById(id);
    brand.isEnable = isEnable;
    brand.updatedBy = userId;
    return brand.save();
  }

  static async enable(id, userId) {
    return this.setEnableStatus(id, true, userId);
  }

  static async disable(id, userId) {
    return this.setEnableStatus(id, false, userId);
  }

  static async delete(id) {
    await assertEntityIsNotReferenced('brand', id);
    const brand = await BrandModel.findByIdAndDelete(id);
    if (!brand) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'برند یافت نشد',
        code: 'BRAND_NOT_FOUND',
      });
    }
    await MainImageService.cleanup(
      MainImageService.getStoredKey(brand.logo, { id }),
      { id },
    );
    return brand;
  }

  static async findAll({ includeDisabled = false } = {}) {
    return BrandModel.find(includeDisabled ? {} : { isEnable: true }).sort({
      createdAt: 1,
    });
  }

  static format(brand) {
    if (!brand) return null;
    const value =
      typeof brand.toObject === 'function' ? brand.toObject() : brand;
    return {
      id: value._id,
      title: value.title,
      title_fa: value.title_fa,
      logo: value.logo,
      thumbnailLogo: value.thumbnailLogo,
      slug: value.slug,
      isEnable: value.isEnable,
      description: value.description,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  static formatMany(brands) {
    return brands.map((brand) => this.format(brand));
  }
}
