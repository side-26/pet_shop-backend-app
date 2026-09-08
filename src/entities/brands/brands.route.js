import express from 'express';

import { ROLES } from '#configs/constants.js';
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
} from './brands.controller.js';

const router = express.Router();

router.get('/brands', getAllBrandsController);
router.get('/brands/:id', getBrandByIdController);

router.post(
  '/brands',
  /* #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/BrandMultipartBody' } } } } */
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  uploadBrandLogo,
  createBrandController,
);
router.patch(
  '/brands/:id/enable',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  enableBrandController,
);
router.patch(
  '/brands/:id/disable',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  disableBrandController,
);
router.delete(
  '/brands/:id',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  deleteBrandController,
);

export default router;
