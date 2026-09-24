import express from 'express';

import { authenticated } from '#middlewares/auth.middleware.js';

import { reverseGeocodeController } from './reverseGeocoding.controller.js';

import { REVERSE_GEOCODING_ROUTES } from './route.path.js';

const router = express.Router();

router.get(
  REVERSE_GEOCODING_ROUTES.reverseGeocode,
  authenticated,
  /* #swagger.responses[200] = { description: 'Reverse-geocoded location', content: { "application/json": { schema: { type: 'object', required: ['isSuccess', 'data'], properties: { isSuccess: { type: 'boolean', example: true }, data: { type: 'object', required: ['formatted_address'], properties: { formatted_address: { type: 'string', example: 'تهران، خیابان فاطمی' }, city: { type: 'string', example: 'تهران' }, state: { type: 'string', example: 'استان تهران' } }, additionalProperties: true } }, example: { isSuccess: true, data: { formatted_address: 'تهران، خیابان فاطمی', city: 'تهران', state: 'استان تهران' } } } } } } */
  reverseGeocodeController,
);

export default router;
