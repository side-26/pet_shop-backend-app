jest.mock('./reverseGeocoding.service.js', () => ({
  ReverseGeocodingService: { reverseGeocode: jest.fn() },
}));

import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import reverseGeocodingRoutes from './reverseGeocoding.route.js';
import { ReverseGeocodingService } from './reverseGeocoding.service.js';

describe('Reverse geocoding API', () => {
  let app;
  let authorization;
  const originalJwtSecret = process.env.JWT_SECRET_KEY;

  beforeAll(() => {
    process.env.JWT_SECRET_KEY = 'reverse-geocoding-test-secret';
    authorization = `Bearer ${jwt.sign(
      { userId: '65a4de97aff1fbb38c437952' },
      process.env.JWT_SECRET_KEY,
    )}`;
    app = express();
    app.use('/api', reverseGeocodingRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => jest.clearAllMocks());

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET_KEY;
    } else {
      process.env.JWT_SECRET_KEY = originalJwtSecret;
    }
  });

  test('rejects unauthenticated requests before calling the service', async () => {
    const response = await request(app).get(
      '/api/reverse-geocode?lat=35.7219&lng=51.3347',
    );

    expect(response.status).toBe(STATUES.UN_AUTHORIZED);
    expect(response.body.isSuccess).toBe(false);
    expect(ReverseGeocodingService.reverseGeocode).not.toHaveBeenCalled();
  });

  test('GET /api/reverse-geocode validates coordinates and returns location data', async () => {
    const location = {
      formatted_address: 'تهران، خیابان فاطمی',
      city: 'تهران',
      state: 'استان تهران',
    };
    ReverseGeocodingService.reverseGeocode.mockResolvedValue(location);

    const response = await request(app)
      .get('/api/reverse-geocode?lat=35.7219&lng=51.3347')
      .set('Authorization', authorization);

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body).toEqual({ isSuccess: true, data: location });
    expect(ReverseGeocodingService.reverseGeocode).toHaveBeenCalledWith({
      lat: 35.7219,
      lng: 51.3347,
    });
  });

  test.each([
    '',
    '?lat=35',
    '?lng=51',
    '?lat=91&lng=51',
    '?lat=-91&lng=51',
    '?lat=35&lng=181',
    '?lat=35&lng=-181',
    '?lat=abc&lng=51',
    '?lat=35&lng=abc',
  ])('rejects invalid query "%s" before calling the service', async (query) => {
    const response = await request(app)
      .get(`/api/reverse-geocode${query}`)
      .set('Authorization', authorization);

    expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(response.body.isSuccess).toBe(false);
    expect(ReverseGeocodingService.reverseGeocode).not.toHaveBeenCalled();
  });

  test('forwards mapped service errors to error middleware', async () => {
    const error = new Error('سرویس مکان‌یابی موقتاً در دسترس نیست');
    error.statusCode = STATUES.OTHER_PROBLEM;
    ReverseGeocodingService.reverseGeocode.mockRejectedValue(error);

    const response = await request(app)
      .get('/api/reverse-geocode?lat=35&lng=51')
      .set('Authorization', authorization);

    expect(response.status).toBe(STATUES.OTHER_PROBLEM);
    expect(response.body.isSuccess).toBe(false);
    expect(response.body.message).not.toContain('test-neshan-key');
  });
});
