import express from 'express';

import { authenticated } from '#middlewares/auth.middleware.js';

import { reverseGeocodeController } from './reverseGeocoding.controller.js';

const router = express.Router();

router.get('/reverse-geocode', authenticated, reverseGeocodeController);

export default router;
