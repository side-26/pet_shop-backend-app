import express from 'express';

import { getCountriesController } from './countries.controller.js';

const router = express.Router();

router.get(
  '/countries',
  /* #swagger.responses[200] = { description: 'Country list', content: { "application/json": { schema: { $ref: '#/components/schemas/CountriesResponse' } } } } */
  getCountriesController,
);

export default router;
