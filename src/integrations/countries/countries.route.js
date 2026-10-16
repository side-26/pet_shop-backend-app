import express from 'express';

import { getCountriesController } from './countries.controller.js';

import { COUNTRY_ROUTES } from './route.path.js';

const router = express.Router();

router.get(
  COUNTRY_ROUTES.countries,
  /* #swagger.responses[200] = { description: 'Country list', content: { "application/json": { schema: { $ref: '#/components/schemas/CountriesResponse' } } } } */
  getCountriesController,
);

export default router;
