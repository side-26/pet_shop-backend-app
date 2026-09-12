import express from 'express';

import { ROUTES } from '#configs/constants.js';

import {
  getAllPetTypesController,
  getFeaturedPetTypesController,
  getFeaturedProductsController,
  getMostDiscountedProductsController,
  getMostPopularPetsController,
  getMostPopularProductsController,
  getPetBySlugController,
  getProductBySlugController,
  getRecentlyUpdatedPetsController,
} from './landing.controller.js';

const router = express.Router();

router.get(
  '/landing/pet-types',
  /* #swagger.summary = 'Get four featured pet types'
     #swagger.description = 'Returns up to four enabled pet types with their main image, thumbnail, title, and summary.'
     #swagger.responses[200] = { description: 'Featured pet types' } */
  getFeaturedPetTypesController,
);
router.get(
  '/landing/products/discounted',
  /* #swagger.summary = 'Get the most discounted products'
     #swagger.description = 'Returns enabled products ordered by discount percentage, including the main image thumbnail, product price, discount percentage, and calculated discount amount. The optional limit defaults to four and is capped at 100.'
     #swagger.parameters['limit'] = { in: 'query', type: 'integer', minimum: 1, maximum: 100, default: 4 }
     #swagger.responses[200] = { description: 'Most discounted products' } */
  getMostDiscountedProductsController,
);
router.get(
  '/landing/pet-types/all',
  /* #swagger.summary = 'Get all pet types'
     #swagger.description = 'Returns every enabled pet type with its main image, thumbnail, title, and summary.'
     #swagger.responses[200] = { description: 'Enabled pet types' } */
  getAllPetTypesController,
);
router.get(
  '/landing/products/popular',
  /* #swagger.summary = 'Get four most popular products'
     #swagger.description = 'Returns up to four enabled products ordered by sales volume, including the main image thumbnail, slug, product price, discount percentage, and calculated discount amount.'
     #swagger.responses[200] = { description: 'Most popular products' } */
  getMostPopularProductsController,
);
router.get(
  ROUTES.landing.featuredProducts,
  /* #swagger.summary = 'Get distinct featured products'
     #swagger.path = '/landing/products/featured'
     #swagger.description = 'Returns up to four distinct enabled products in priority order: most purchased, most discounted, cheapest, then most wishlisted. A product selected for an earlier type is excluded from later types.'
     #swagger.responses[200] = { description: 'Distinct featured products' } */
  getFeaturedProductsController,
);
router.get(
  '/landing/pets/popular',
  /* #swagger.summary = 'Get five most popular pets'
     #swagger.description = 'Returns up to five enabled pets ranked by non-management user wishlist frequency. When no pets are wishlisted, sales volume is used; sparse results are supplemented with the highest-priced enabled pets.'
     #swagger.responses[200] = { description: 'Most popular pets' } */
  getMostPopularPetsController,
);
router.get(
  '/landing/pets/recent',
  /* #swagger.summary = 'Get five recently updated available pets'
     #swagger.description = 'Returns up to five enabled, in-stock pets that have an updatedBy value, ordered by most recent update. When fewer than five qualify, the result is completed with the highest-priced enabled, in-stock pets without duplicates.'
     #swagger.responses[200] = { description: 'Recently updated available pets' } */
  getRecentlyUpdatedPetsController,
);
router.get(
  '/landing/pets/:slug',
  /* #swagger.summary = 'Get an enabled pet by slug'
     #swagger.description = 'Returns the full customer-safe pet detail for an enabled pet.'
     #swagger.parameters['slug'] = { in: 'path', required: true, type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }
     #swagger.responses[200] = { description: 'Pet detail' }
     #swagger.responses[404] = { description: 'Pet not found' } */
  getPetBySlugController,
);
router.get(
  '/landing/products/:slug',
  /* #swagger.summary = 'Get an enabled product by slug'
     #swagger.description = 'Returns the full customer-safe product detail for an enabled product.'
     #swagger.parameters['slug'] = { in: 'path', required: true, type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }
     #swagger.responses[200] = { description: 'Product detail' }
     #swagger.responses[404] = { description: 'Product not found' } */
  getProductBySlugController,
);

export default router;
