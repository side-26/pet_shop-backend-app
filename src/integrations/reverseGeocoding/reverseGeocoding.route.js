import express from 'express';

import { authenticated } from '#middlewares/auth.middleware.js';

import { reverseGeocodeController } from './reverseGeocoding.controller.js';

import { REVERSE_GEOCODING_ROUTES } from './route.path.js';

const router = express.Router();

router.get(
  REVERSE_GEOCODING_ROUTES.reverseGeocode,
  authenticated,
  reverseGeocodeController,
);

export default router;
