import express from 'express';

import { MANAGEMENT_ROLES, ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import {
  uploadProductCreateImages,
  uploadProductUpdateImages,
} from '#middlewares/upload.middleware.js';

import {
  createProductController,
  deleteProductController,
  disableProductController,
  editProductController,
  enableProductController,
  getCustomerProductController,
  getCustomerProductListController,
  getManagementProductController,
  getManagementProductListController,
  getProductImagesController,
  getProductMainInfoController,
  getProductPropertyDefinitionsController,
  getProductWeightsController,
  updateProductController,
  updateProductImagesController,
  updateProductMainInfoController,
  replaceProductPropertyDefinitionsController,
  replaceProductWeightsController,
  updateProductUserRateController,
} from './products.controller.js';

import { PRODUCT_ROUTES } from './route.path.js';

const router = express.Router();

router.get(
  PRODUCT_ROUTES.products,
  /* #swagger.responses[200] = { description: 'Paginated customer product list', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } */
  getCustomerProductListController,
);
router.get(PRODUCT_ROUTES.productsCustomerById, getCustomerProductController);
router.get(
  PRODUCT_ROUTES.productsPropertyDefinitionsById,
  getProductPropertyDefinitionsController,
);
router.get(PRODUCT_ROUTES.productsWeightsById, getProductWeightsController);
router.put(
  PRODUCT_ROUTES.productsRange,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ProductWeightsReplaceBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  replaceProductWeightsController,
);
router.put(
  PRODUCT_ROUTES.productsPropertyDefinitions,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  replaceProductPropertyDefinitionsController,
);
router.patch(
  PRODUCT_ROUTES.productsByIdUserRate,
  authenticated,
  roleMiddleware(ROLES.CUSTOMER),
  updateProductUserRateController,
);
router.get(
  PRODUCT_ROUTES.productsPaginate,
  /* #swagger.parameters['title'] = { in: 'query', type: 'string' }
     #swagger.parameters['category'] = { in: 'query', type: 'string' }
     #swagger.parameters['subCategory'] = { in: 'query', type: 'string' }
     #swagger.parameters['price'] = { in: 'query', type: 'number', minimum: 0 }
     #swagger.parameters['quantity'] = { in: 'query', type: 'integer', minimum: 0 }
     #swagger.parameters['isEnable'] = { in: 'query', type: 'boolean' }
     #swagger.responses[200] = { description: 'Paginated management product list. Each result includes the management-only salesVolume counter.', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getManagementProductListController,
);
router.get(
  PRODUCT_ROUTES.productsManageById,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getManagementProductController,
);
router.get(
  PRODUCT_ROUTES.productsByIdImages,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getProductImagesController,
);
router.get(
  PRODUCT_ROUTES.productsByIdMainInfo,
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getProductMainInfoController,
);
router.post(
  PRODUCT_ROUTES.products,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/MainImageCreateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadProductCreateImages,
  createProductController,
);
router.put(
  PRODUCT_ROUTES.productsById,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ProductBaseInfoUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  updateProductController,
);
router.patch(
  PRODUCT_ROUTES.productsById,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ProductBaseInfoUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  editProductController,
);
router.put(
  PRODUCT_ROUTES.productsByIdMainInfo,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ProductBaseInfoUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  updateProductMainInfoController,
);
router.put(
  PRODUCT_ROUTES.productsByIdImages,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/ProductImagesUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadProductUpdateImages,
  updateProductImagesController,
);
router.patch(
  PRODUCT_ROUTES.productsByIdEnable,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  enableProductController,
);
router.patch(
  PRODUCT_ROUTES.productsByIdDisable,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  disableProductController,
);
router.delete(
  PRODUCT_ROUTES.productsById,
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteProductController,
);

export default router;
