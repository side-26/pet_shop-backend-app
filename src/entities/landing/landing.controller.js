import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import { createLandingSearchRegex } from './landing.helpers.js';
import {
  landingLimitSchema,
  landingProductListQuerySchema,
  landingPetListQuerySchema,
  landingSearchQuerySchema,
  landingSlugSchema,
} from './landing.schema.js';
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

export const getRecentlyUpdatedPetsController = (_req, res, next) =>
  getLandingSection(res, next, 'getRecentlyUpdatedPets');

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

export const getMostPopularBrandsController = (_req, res, next) =>
  getLandingSection(res, next, 'getMostPopularBrands');

export const searchCatalogController = async (req, res, next) => {
  try {
    const { search } = returnFormValidation(
      landingSearchQuerySchema,
      req.query,
    );
    const data = await LandingService.searchCatalog(
      createLandingSearchRegex(search),
    );
    setSuccessResponse(res, STATUES.SUCCESS, { data });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getFeaturedProductsController = (_req, res, next) =>
  getLandingSection(res, next, 'getFeaturedProducts');

export const getProductListController = async (req, res, next) => {
  try {
    const query = returnFormValidation(
      landingProductListQuerySchema,
      req.query,
    );
    const data = await LandingService.getProductList(query);
    setSuccessResponse(res, STATUES.SUCCESS, { data });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getPetListController = async (req, res, next) => {
  try {
    const query = returnFormValidation(landingPetListQuerySchema, req.query);
    const data = await LandingService.getPetList(query);
    setSuccessResponse(res, STATUES.SUCCESS, { data });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

const getCatalogItemBySlug = async (req, res, next, serviceMethod) => {
  try {
    const { slug } = returnFormValidation(landingSlugSchema, req.params);
    const data = await LandingService[serviceMethod](slug, req.user?.userId);
    setSuccessResponse(res, STATUES.SUCCESS, { data });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getPetBySlugController = (req, res, next) =>
  getCatalogItemBySlug(req, res, next, 'getPetBySlug');

export const getProductBySlugController = (req, res, next) =>
  getCatalogItemBySlug(req, res, next, 'getProductBySlug');
