import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  setSuccessResponse,
} from '#utils/helpers.js';

import { LandingService } from './landing.service.js';

const getLandingSection = async (res, next, serviceMethod) => {
  try {
    const data = await LandingService[serviceMethod]();
    setSuccessResponse(res, STATUES.SUCCESS, { data });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getFeaturedPetTypesController = (_req, res, next) =>
  getLandingSection(res, next, 'getFeaturedPetTypes');

export const getAllPetTypesController = (_req, res, next) =>
  getLandingSection(res, next, 'getAllPetTypes');

export const getMostDiscountedProductsController = (_req, res, next) =>
  getLandingSection(res, next, 'getMostDiscountedProducts');

export const getMostPopularProductsController = (_req, res, next) =>
  getLandingSection(res, next, 'getMostPopularProducts');
