import express from 'express';

import { getCountriesController } from './countries.controller.js';

const router = express.Router();

router.get('/countries', getCountriesController);

export default router;
