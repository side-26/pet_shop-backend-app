import express from 'express';

import { MANAGEMENT_ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import { uploadBrandLogo } from '#middlewares/upload.middleware.js';

import {
  createBrandController,
  deleteBrandController,
  disableBrandController,
  enableBrandController,
  getAllBrandsController,
  getBrandByIdController,
  getEnabledBrandsController,
  updateBrandController,
} from './brands.controller.js';

import { BRAND_ROUTES } from './route.path.js';

const router = express.Router();

router.get(
  BRAND_ROUTES.brands,
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getAllBrandsController,
);
router.get(
  BRAND_ROUTES.brandsEnabled,
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getEnabledBrandsController,
);
router.get(
  BRAND_ROUTES.brandsById,
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getBrandByIdController,
);

router.post(
  BRAND_ROUTES.brands,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/BrandMultipartBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadBrandLogo,
  createBrandController,
);
router.put(
  BRAND_ROUTES.brandsById,
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/BrandUpdateMultipartBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadBrandLogo,
  updateBrandController,
);
router.patch(
  BRAND_ROUTES.brandsByIdEnable,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  enableBrandController,
);
router.patch(
  BRAND_ROUTES.brandsByIdDisable,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  disableBrandController,
);
router.delete(
  BRAND_ROUTES.brandsById,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  deleteBrandController,
);

export default router;
