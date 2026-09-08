import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  brandIdZodSchema,
  brandLogoZodSchema,
  createBrandZodSchema,
} from './brands.schema.js';
import { BrandService } from './brands.service.js';

export const createBrandController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createBrandZodSchema, req.body);
    if (req.file) {
      returnFormValidation(brandLogoZodSchema, {
        mimetype: req.file.mimetype,
        imageFileSize: req.file.size,
      });
    }
    const brand = await BrandService.create(body, req.user?.id, req.file);
    setSuccessResponse(res, STATUES.CREATED, {
      message: `برند "${brand.title}" با موفقیت ایجاد شد`,
      data: BrandService.format(brand),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getAllBrandsController = async (req, res, next) => {
  try {
    const brands = await BrandService.findAll({
      includeDisabled: req.query.includeDisabled === 'true',
    });
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: BrandService.formatMany(brands),
      totalRecords: brands.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getEnabledBrandsController = async (_req, res, next) => {
  try {
    const brands = await BrandService.findAll();
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: BrandService.formatMany(brands),
      totalRecords: brands.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getBrandByIdController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(brandIdZodSchema, req.params);
    const brand = await BrandService.findById(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: BrandService.format(brand),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

const setBrandStatus = (isEnable) => async (req, res, next) => {
  try {
    const { id } = returnFormValidation(brandIdZodSchema, req.params);
    const brand = isEnable
      ? await BrandService.enable(id, req.user?.id)
      : await BrandService.disable(id, req.user?.id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `برند "${brand.title}" با موفقیت ${isEnable ? 'فعال' : 'غیرفعال'} شد`,
      data: BrandService.format(brand),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const enableBrandController = setBrandStatus(true);
export const disableBrandController = setBrandStatus(false);

export const deleteBrandController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(brandIdZodSchema, req.params);
    const brand = await BrandService.delete(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `برند "${brand.title}" با موفقیت حذف شد`,
      data: { id: brand._id },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
