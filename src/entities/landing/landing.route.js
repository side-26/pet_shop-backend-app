import express from 'express';

import {
  getAllPetTypesController,
  getFeaturedPetTypesController,
  getMostDiscountedProductsController,
  getMostPopularProductsController,
} from './landing.controller.js';

const router = express.Router();

router.get(
  '/landing/pet-types',
  /* #swagger.summary = 'Get four featured pet types'
     #swagger.description = 'Returns up to four enabled pet types with their image, title, and summary.'
     #swagger.responses[200] = { description: 'Featured pet types' } */
  getFeaturedPetTypesController,
);
router.get(
  '/landing/products/discounted',
  /* #swagger.summary = 'Get four most discounted products'
     #swagger.description = 'Returns up to four enabled products ordered by discount percentage.'
     #swagger.responses[200] = { description: 'Most discounted products' } */
  getMostDiscountedProductsController,
);
router.get(
  '/landing/pet-types/all',
  /* #swagger.summary = 'Get all pet types'
     #swagger.description = 'Returns every enabled pet type with its image, title, and summary.'
     #swagger.responses[200] = { description: 'Enabled pet types' } */
  getAllPetTypesController,
);
router.get(
  '/landing/products/popular',
  /* #swagger.summary = 'Get four most popular products'
     #swagger.description = 'Returns up to four enabled products ordered by sales volume.'
     #swagger.responses[200] = { description: 'Most popular products' } */
  getMostPopularProductsController,
);

export default router;
