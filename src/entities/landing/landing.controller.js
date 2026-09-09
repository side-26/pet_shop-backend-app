import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import { landingLimitSchema, landingSlugSchema } from './landing.schema.js';
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

export const getMostPopularPetsController = (_req, res, next) =>
  getLandingSection(res, next, 'getMostPopularPets');

export const getMostDiscountedProductsController = async (req, res, next) => {
  try {
    const { limit } = returnFormValidation(landingLimitSchema, req.query);
    const data = await LandingService.getMostDiscountedProducts(limit);
    setSuccessResponse(res, STATUES.SUCCESS, { data });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getMostPopularProductsController = (_req, res, next) =>
  getLandingSection(res, next, 'getMostPopularProducts');

const getCatalogItemBySlug = async (req, res, next, serviceMethod) => {
  try {
    const { slug } = returnFormValidation(landingSlugSchema, req.params);
    const data = await LandingService[serviceMethod](slug);
    setSuccessResponse(res, STATUES.SUCCESS, { data });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getPetBySlugController = (req, res, next) =>
  getCatalogItemBySlug(req, res, next, 'getPetBySlug');

export const getProductBySlugController = (req, res, next) =>
  getCatalogItemBySlug(req, res, next, 'getProductBySlug');
