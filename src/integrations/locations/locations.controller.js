import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import { getCitiesByProvinceIdSchema } from './locations.schema.js';
import { LocationsService } from './locations.service.js';

export const getAllProvincesController = async (req, res, next) => {
  try {
    const provinces = await LocationsService.getAllProvinces();
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: provinces,
      totalRecords: provinces.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getCitiesByProvinceIdController = async (req, res, next) => {
  try {
    const { provinceId } = returnFormValidation(
      getCitiesByProvinceIdSchema,
      req.params,
    );
    const cities = await LocationsService.getCitiesByProvinceId(provinceId);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: cities,
      totalRecords: cities.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
