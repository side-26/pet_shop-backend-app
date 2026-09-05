import express from 'express';

import { MANAGEMENT_ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';
import { uploadMainImage } from '#middlewares/upload.middleware.js';

import {
  deleteImageController,
  uploadImageController,
} from './images.controller.js';

const router = express.Router();

router.post(
  '/images',
  /*
    #swagger.tags = ['Images']
    #swagger.summary = 'Upload an optimized management image'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { type: 'object', required: ['mainImage'], properties: { mainImage: { type: 'string', format: 'binary' } } } } } }
    #swagger.responses[201] = { description: 'Optimized image uploaded', content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
    #swagger.responses[403] = { description: 'Admin or Seller role required' }
    #swagger.responses[422] = { description: 'Invalid or missing image' }
  */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  uploadMainImage,
  uploadImageController,
);

router.delete(
  '/images',
  /*
    #swagger.tags = ['Images']
    #swagger.summary = 'Delete a management image from storage'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { type: 'object', required: ['imageUrl'], properties: { imageUrl: { type: 'string', format: 'uri' } } } } } }
    #swagger.responses[200] = { description: 'Image deleted', content: { "application/json": { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
    #swagger.responses[403] = { description: 'Admin or Seller role required' }
    #swagger.responses[422] = { description: 'Invalid storage image URL' }
  */
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  deleteImageController,
);

export default router;
