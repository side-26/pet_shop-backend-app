import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  setSuccessResponse,
} from '#utils/helpers.js';

import { CountriesService } from './countries.service.js';

export const getCountriesController = async (req, res, next) => {
  try {
    const countries = await CountriesService.getAll();
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: countries,
      totalRecords: countries.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
