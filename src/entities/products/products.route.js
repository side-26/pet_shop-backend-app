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
  getProductPriceController,
  updateProductController,
  updateProductImagesController,
  updateProductPriceController,
} from './products.controller.js';

const router = express.Router();

router.get('/products', getCustomerProductListController);
router.get('/products/customer/:id', getCustomerProductController);
router.get(
  '/products/paginate',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getManagementProductListController,
);
router.get(
  '/products/manage/:id',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getManagementProductController,
);
router.get(
  '/products/:id/images',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getProductImagesController,
);
router.get(
  '/products/:id/price',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getProductPriceController,
);
router.post(
  '/products',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/MainImageCreateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadProductCreateImages,
  createProductController,
);
router.put(
  '/products/:id',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ProductBaseInfoUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  updateProductController,
);
router.patch(
  '/products/:id',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ProductBaseInfoUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  editProductController,
);
router.put(
  '/products/:id/images',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/ProductImagesUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadProductUpdateImages,
  updateProductImagesController,
);
router.put(
  '/products/:id/price',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ProductPriceUpdateBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  updateProductPriceController,
);
router.patch(
  '/products/:id/enable',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  enableProductController,
);
router.patch(
  '/products/:id/disable',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  disableProductController,
);
router.delete(
  '/products/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteProductController,
);

export default router;
