import express from 'express';

import {
  getAllPetTypesController,
  getFeaturedPetTypesController,
  getMostDiscountedProductsController,
  getMostPopularProductsController,
  getPetBySlugController,
  getProductBySlugController,
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
     #swagger.description = 'Returns enabled products ordered by discount percentage, including product price, discount percentage, and calculated discount amount. The optional limit defaults to four and is capped at 100.'
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
     #swagger.description = 'Returns up to four enabled products ordered by sales volume, including product price, discount percentage, and calculated discount amount.'
     #swagger.responses[200] = { description: 'Most popular products' } */
  getMostPopularProductsController,
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
