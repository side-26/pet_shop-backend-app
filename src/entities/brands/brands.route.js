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
} from './brands.controller.js';

const router = express.Router();

router.get(
  '/brands',
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getAllBrandsController,
);
router.get(
  '/brands/enabled',
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getEnabledBrandsController,
);
router.get(
  '/brands/:id',
  /* #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  getBrandByIdController,
);

router.post(
  '/brands',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/BrandMultipartBody' } } } } */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadBrandLogo,
  createBrandController,
);
router.patch(
  '/brands/:id/enable',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  enableBrandController,
);
router.patch(
  '/brands/:id/disable',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  disableBrandController,
);
router.delete(
  '/brands/:id',
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  deleteBrandController,
);

export default router;
