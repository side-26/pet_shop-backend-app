jest.mock('./locations.service.js', () => ({
  LocationsService: {
    getAllProvinces: jest.fn(),
    getCitiesByProvinceId: jest.fn(),
  },
}));

import express from 'express';
import request from 'supertest';

import { STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import locationRoutes from './locations.route.js';
import { LocationsService } from './locations.service.js';

describe('Locations API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use('/api', locationRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => jest.clearAllMocks());

  test('GET /api/provinces returns all provinces', async () => {
    const provinces = [{ provinceId: 8, title: 'تهران' }];
    LocationsService.getAllProvinces.mockResolvedValue(provinces);

    const response = await request(app).get('/api/provinces');

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body).toEqual({
      isSuccess: true,
      data: provinces,
      totalRecords: 1,
    });
  });

  test('GET /api/cities/:provinceId returns matching cities', async () => {
    const provinceId = 8;
    const cities = [{ title: 'تهران', provinceId }];
    LocationsService.getCitiesByProvinceId.mockResolvedValue(cities);

    const response = await request(app).get(`/api/cities/${provinceId}`);

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body).toEqual({
      isSuccess: true,
      data: cities,
      totalRecords: 1,
    });
    expect(LocationsService.getCitiesByProvinceId).toHaveBeenCalledWith(8);
  });

  test('GET /api/cities/:provinceId rejects an invalid province id', async () => {
    const response = await request(app).get('/api/cities/not-a-valid-id');

    expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(response.body).toMatchObject({
      isSuccess: false,
      data: {
        messages: [{ field: 'provinceId' }],
      },
    });
    expect(response.body.data.messages[0].value).toContain('استان');
    expect(LocationsService.getCitiesByProvinceId).not.toHaveBeenCalled();
  });

  test('location routes forward database failures to error middleware', async () => {
    const error = new Error('database unavailable');
    error.statusCode = STATUES.INTERNAL_SERVER;
    LocationsService.getAllProvinces.mockRejectedValue(error);

    const response = await request(app).get('/api/provinces');

    expect(response.status).toBe(STATUES.INTERNAL_SERVER);
    expect(response.body.isSuccess).toBe(false);
  });
});
