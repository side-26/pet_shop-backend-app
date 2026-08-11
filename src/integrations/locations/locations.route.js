import express from 'express';

import {
  getAllProvincesController,
  getCitiesByProvinceIdController,
} from './locations.controller.js';

const router = express.Router();

router.get('/provinces', getAllProvincesController);
router.get('/cities/:provinceId', getCitiesByProvinceIdController);

export default router;
