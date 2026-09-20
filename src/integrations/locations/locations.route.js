import express from 'express';

import {
  getAllProvincesController,
  getCitiesByProvinceIdController,
} from './locations.controller.js';

import { LOCATION_ROUTES } from './route.path.js';

const router = express.Router();

router.get(LOCATION_ROUTES.provinces, getAllProvincesController);
router.get(LOCATION_ROUTES.citiesByProvinceId, getCitiesByProvinceIdController);

export default router;
