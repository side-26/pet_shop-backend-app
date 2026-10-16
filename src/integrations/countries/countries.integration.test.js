jest.mock('./countries.service.js', () => ({
  CountriesService: { getAll: jest.fn() },
}));

import express from 'express';
import request from 'supertest';

import { STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import countryRoutes from './countries.route.js';
import { CountriesService } from './countries.service.js';

describe('Countries wrapper API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use('/api', countryRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => jest.clearAllMocks());

  test('GET /api/countries returns only the public country fields', async () => {
    CountriesService.getAll.mockResolvedValue([
      {
        title: 'Iran',
        titleFa: 'ایران',
        logo: 'https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/ir.svg',
      },
    ]);

    const response = await request(app).get('/api/countries');

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body).toEqual({
      isSuccess: true,
      data: [
        {
          title: 'Iran',
          titleFa: 'ایران',
          logo: 'https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/ir.svg',
        },
      ],
      totalRecords: 1,
    });
  });

  test('GET /api/countries forwards provider errors to error middleware', async () => {
    const error = new Error('Country information is temporarily unavailable');
    error.statusCode = STATUES.OTHER_PROBLEM;
    CountriesService.getAll.mockRejectedValue(error);

    const response = await request(app).get('/api/countries');

    expect(response.status).toBe(STATUES.OTHER_PROBLEM);
    expect(response.body.isSuccess).toBe(false);
  });
});
