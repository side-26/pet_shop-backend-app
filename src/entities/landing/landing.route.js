import express from 'express';

import { optionallyAuthenticated } from '#middlewares/auth.middleware.js';

import {
  getAllPetTypesController,
  getFeaturedPetTypesController,
  getFeaturedProductsController,
  getMostPopularBrandsController,
  getMostDiscountedProductsController,
  getMostPopularPetsController,
  getMostPopularProductsController,
  getPetListController,
  getPetBySlugController,
  getProductListController,
  getProductBySlugController,
  getRecentlyUpdatedPetsController,
  searchCatalogController,
} from './landing.controller.js';

import { LANDING_ROUTES } from './route.path.js';

const router = express.Router();

router.get(
  LANDING_ROUTES.landingSearch,
  /* #swagger.summary = 'Search enabled pets and products'
     #swagger.description = 'Searches enabled products by title, category title, or sub-category title and enabled pets by title, pet-type title, or breed title. Returns at most 20 compact items.'
     #swagger.parameters['search'] = { in: 'query', required: true, type: 'string', minLength: 1, maxLength: 100 }
     #swagger.responses[200] = { description: 'Matching compact catalog items with title, mainImage, and thumbnailImage' }
     #swagger.responses[422] = { description: 'Search query validation error' } */
  searchCatalogController,
);

router.get(
  LANDING_ROUTES.landingPetsPaginate,
  /* #swagger.summary = 'Get enabled pets with dynamic landing filters'
     #swagger.parameters['petType'] = { in: 'query', type: 'string' }
     #swagger.parameters['breed'] = { in: 'query', type: 'string' }
     #swagger.parameters['priceFrom'] = { in: 'query', type: 'number', minimum: 0 }
     #swagger.parameters['priceTo'] = { in: 'query', type: 'number', minimum: 0 }
     #swagger.parameters['isEnable'] = { in: 'query', type: 'boolean' }
     #swagger.parameters['sort'] = { in: 'query', type: 'string', enum: ['most-valued', 'less-valued', 'most-sales', 'less-sales'], default: 'most-sales' }
     #swagger.responses[200] = { description: 'Filtered, paginated enabled pets with filters and sort metadata' } */
  getPetListController,
);
router.get(
  LANDING_ROUTES.landingPetTypes,
  /* #swagger.summary = 'Get four featured pet types'
     #swagger.description = 'Returns up to four enabled pet types with their main image, thumbnail, title, and summary.'
     #swagger.responses[200] = { description: 'Featured pet types' } */
  getFeaturedPetTypesController,
);
router.get(
  LANDING_ROUTES.landingProductsDiscounted,
  /* #swagger.summary = 'Get the most discounted products'
     #swagger.description = 'Returns enabled products ordered by discount percentage, including the main image thumbnail, product price, discount percentage, calculated discount amount, minimum final price, and minimum quantity across weights. The optional limit defaults to four and is capped at 100.'
     #swagger.parameters['limit'] = { in: 'query', type: 'integer', minimum: 1, maximum: 100, default: 4 }
     #swagger.responses[200] = { description: 'Most discounted products' } */
  getMostDiscountedProductsController,
);
router.get(
  LANDING_ROUTES.landingPetTypesAll,
  /* #swagger.summary = 'Get all pet types'
     #swagger.description = 'Returns every enabled pet type with its main image, thumbnail, title, and summary.'
     #swagger.responses[200] = { description: 'Enabled pet types' } */
  getAllPetTypesController,
);
router.get(
  LANDING_ROUTES.landingProductsPopular,
  /* #swagger.summary = 'Get four most popular products'
     #swagger.description = 'Returns up to four enabled products ordered by sales volume, including the main image thumbnail, slug, product price, discount percentage, final discounted price, minimum final price, and minimum quantity across weights.'
     #swagger.responses[200] = { description: 'Most popular products' } */
  getMostPopularProductsController,
);
router.get(
  LANDING_ROUTES.landingProductsFeatured,
  /* #swagger.summary = 'Get distinct featured products'
     #swagger.description = 'Returns up to four distinct enabled products in priority order: most purchased, most discounted, cheapest, then most wishlisted. Each product includes its minimum final price and minimum quantity across weights. A product selected for an earlier type is excluded from later types.'
     #swagger.responses[200] = { description: 'Distinct featured products' } */
  getFeaturedProductsController,
);
router.get(
  LANDING_ROUTES.landingProducts,
  /* #swagger.summary = 'Get enabled products with dynamic landing filters'
     #swagger.description = 'Returns enabled products with their minimum final price and minimum quantity across weights, plus disjunctive category, sub-category, brand, price, and enabled-status facets. Multi-select filter values are comma-separated IDs; each facet excludes its own selected value while calculating option counts. As a public catalog endpoint, isEnable=false returns no records.'
     #swagger.parameters['category'] = { in: 'query', type: 'string', pattern: '^[0-9a-fA-F]{24}(,[0-9a-fA-F]{24})*$' }
     #swagger.parameters['subCategory'] = { in: 'query', type: 'string', pattern: '^[0-9a-fA-F]{24}(,[0-9a-fA-F]{24})*$' }
     #swagger.parameters['brand'] = { in: 'query', type: 'string', pattern: '^[0-9a-fA-F]{24}(,[0-9a-fA-F]{24})*$' }
     #swagger.parameters['priceFrom'] = { in: 'query', type: 'number', minimum: 0 }
     #swagger.parameters['priceTo'] = { in: 'query', type: 'number', minimum: 0 }
     #swagger.parameters['isEnable'] = { in: 'query', type: 'boolean', description: 'Public catalog status filter; false returns no records.' }
     #swagger.parameters['sort'] = { in: 'query', type: 'string', enum: ['most-valued', 'less-valued', 'most-sales', 'less-sales'], default: 'most-sales' }
     #swagger.parameters['page'] = { in: 'query', type: 'integer', minimum: 1, default: 1 }
     #swagger.parameters['limit'] = { in: 'query', type: 'integer', minimum: 1, maximum: 100, default: 20 }
     #swagger.responses[200] = { description: 'Filtered, paginated enabled products with filters and sort metadata' } */
  getProductListController,
);
router.get(
  LANDING_ROUTES.landingBrandsPopular,
  /* #swagger.summary = 'Get five enabled brands with the most enabled products'
     #swagger.description = 'Returns up to five enabled brands ranked by their enabled-product count. Disabled brands and disabled products are excluded before the result limit is applied.'
     #swagger.responses[200] = { description: 'Most popular brands' } */
  getMostPopularBrandsController,
);
router.get(
  LANDING_ROUTES.landingPetsPopular,
  /* #swagger.summary = 'Get five most popular pets'
     #swagger.description = 'Returns up to five enabled pets ranked by non-management user wishlist frequency. When no pets are wishlisted, sales volume is used; sparse results are supplemented with the highest-priced enabled pets.'
     #swagger.responses[200] = { description: 'Most popular pets' } */
  getMostPopularPetsController,
);
router.get(
  LANDING_ROUTES.landingPetsRecent,
  /* #swagger.summary = 'Get five recently updated available pets'
     #swagger.description = 'Returns up to five enabled, in-stock pets that have an updatedBy value, ordered by most recent update. When fewer than five qualify, the result is completed with the highest-priced enabled, in-stock pets without duplicates.'
     #swagger.responses[200] = { description: 'Recently updated available pets' } */
  getRecentlyUpdatedPetsController,
);
router.get(
  LANDING_ROUTES.landingPetsBySlug,
  /* #swagger.summary = 'Get an enabled pet by slug'
     #swagger.description = 'Returns the full customer-safe pet detail for an enabled pet.'
     #swagger.parameters['slug'] = { in: 'path', required: true, type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }
     #swagger.responses[200] = { description: 'Pet detail' }
     #swagger.responses[404] = { description: 'Pet not found' } */
  getPetBySlugController,
);
router.get(
  LANDING_ROUTES.landingProductsBySlug,
  /* #swagger.summary = 'Get an enabled product by slug'
     #swagger.description = 'Returns the full customer-safe product detail for an enabled product, including its category pet type with only id, title, displayName, and propertyDefinitions.'
     #swagger.parameters['slug'] = { in: 'path', required: true, type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }
     #swagger.responses[200] = { description: 'Product detail' }
     #swagger.responses[404] = { description: 'Product not found' } */
  optionallyAuthenticated,
  getProductBySlugController,
);

export default router;
