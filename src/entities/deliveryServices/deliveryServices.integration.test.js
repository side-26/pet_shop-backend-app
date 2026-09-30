jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, _res, next) => {
    req.user = {
      id: '65a4de97aff1fbb38c437952',
      role: req.get('x-test-role') || 'admin',
    };
    next();
  },
}));

jest.mock('#middlewares/role.middleware.js', () => ({
  roleMiddleware: (roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ isSuccess: false });
  },
}));

import express from 'express';
import request from 'supertest';

import { errorHandler } from '#middlewares/error.middleware.js';

import { DeliveryServiceModel } from './deliveryServices.model.js';
import deliveryServiceRoutes from './deliveryServices.route.js';

describe('Delivery service API', () => {
  let app;
  const payload = {
    title: 'Tehran Express',
    title_fa: 'اکسپرس تهران',
    logo: 'https://cdn.example.com/delivery-services/tehran-express.webp',
    originCoordinates: [51.389, 35.6892],
    availability: {
      sunday: [],
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [{ startsAt: '09:00', endsAt: '11:00' }],
    },
    basePrice: 10000,
    packingPrice: 3000,
    cityLeadDays: 0,
    outsideCityLeadDays: 1,
    pricePerKilometerInCity: 4000,
    pricePerKilometer: 5000,
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', deliveryServiceRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await DeliveryServiceModel.deleteMany({});
  });

  test('creates and reads an enabled provider', async () => {
    const created = await request(app)
      .post('/api/delivery-services')
      .send(payload)
      .expect(201);

    expect(created.body.data).toMatchObject({
      title: payload.title,
      originCoordinates: payload.originCoordinates,
      isEnable: true,
    });

    const listed = await request(app).get('/api/delivery-services').expect(200);
    expect(listed.body).toMatchObject({ totalRecords: 1 });
    await request(app)
      .get(`/api/delivery-services/${created.body.data.id}`)
      .expect(200);
  });

  test('returns enabled services with a distance quote and localized availability days', async () => {
    await DeliveryServiceModel.create(payload);
    await DeliveryServiceModel.create({
      ...payload,
      title: 'Disabled Express',
      title_fa: 'اکسپرس غیرفعال',
      isEnable: false,
    });

    const response = await request(app)
      .get('/api/delivery-services/available')
      .query({ lat: 35.7, lng: 51.4 })
      .expect(200);

    expect(response.body).toMatchObject({ totalRecords: 1 });
    expect(response.body.data[0]).toMatchObject({
      title: payload.title,
      logo: payload.logo,
      packingPrice: payload.packingPrice,
    });
    expect(response.body.data[0].calculatedPricePerKilometer).toBeGreaterThan(
      payload.packingPrice,
    );
    expect(response.body.data[0]).not.toHaveProperty('basePrice');
    expect(response.body.data[0]).not.toHaveProperty('pricePerKilometer');
    expect(response.body.data[0].availability[0]).toEqual(
      expect.objectContaining({
        weekday: expect.any(String),
        weekday_fa: expect.any(String),
        date: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
        month_ja: expect.any(Number),
        day_ja: expect.any(Number),
        availableTimes: [
          expect.objectContaining({
            start: expect.any(Number),
            end: expect.any(Number),
          }),
        ],
      }),
    );
  });

  test('updates the complete provider contract and changes availability', async () => {
    const deliveryService = await DeliveryServiceModel.create(payload);
    const updatedPayload = {
      ...payload,
      title: 'Updated Express',
      title_fa: 'اکسپرس به‌روز',
      originCoordinates: [51.4, 35.7],
      basePrice: 20000,
      packingPrice: 4000,
      pricePerKilometerInCity: 6000,
      pricePerKilometer: 7000,
      isEnable: false,
    };

    await request(app)
      .put(`/api/delivery-services/${deliveryService._id}`)
      .send(updatedPayload)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject(updatedPayload);
      });

    await request(app)
      .get('/api/delivery-services')
      .expect((response) => expect(response.body.totalRecords).toBe(0));
    await request(app)
      .get('/api/delivery-services?includeDisabled=true')
      .expect((response) => expect(response.body.totalRecords).toBe(1));
    await request(app)
      .patch(`/api/delivery-services/${deliveryService._id}/enable`)
      .expect(200);
    await request(app)
      .patch(`/api/delivery-services/${deliveryService._id}/disable`)
      .expect(200);
  });

  test('validates bodies and identifiers, and prevents duplicate titles', async () => {
    await request(app)
      .post('/api/delivery-services')
      .send({ title: 'Only title' })
      .expect(422);
    await request(app)
      .post('/api/delivery-services')
      .send({ ...payload, originCoordinates: [200, 35] })
      .expect(422);
    await request(app)
      .get('/api/delivery-services')
      .query({ includeDisabled: ['true', 'false'] })
      .expect(422);
    await request(app).get('/api/delivery-services/not-an-id').expect(422);
    await request(app)
      .put('/api/delivery-services/not-an-id')
      .send(payload)
      .expect(422);

    await DeliveryServiceModel.create(payload);
    await request(app)
      .post('/api/delivery-services')
      .send({ ...payload, title_fa: 'ارسال دیگر' })
      .expect(422);
  });

  test('returns not found errors from status and deletion controllers', async () => {
    const missingId = '65a4de97aff1fbb38c437952';

    await request(app)
      .patch(`/api/delivery-services/${missingId}/enable`)
      .expect(404);
    await request(app)
      .delete(`/api/delivery-services/${missingId}`)
      .expect(404);
  });

  test('enforces model validation and removes version data from JSON', async () => {
    await expect(
      DeliveryServiceModel.create({ ...payload, pricePerKilometer: 0 }),
    ).rejects.toThrow('اعتبارسنجی سرویس ارسال ناموفق بود');

    const deliveryService = await DeliveryServiceModel.create(payload);
    expect(deliveryService.toJSON()).toMatchObject({ packingPrice: 3000 });
    expect(deliveryService.toJSON()).not.toHaveProperty('__v');
  });

  test('rejects customers, permits sellers, and deletes providers', async () => {
    const deliveryService = await DeliveryServiceModel.create(payload);
    await request(app)
      .get('/api/delivery-services')
      .set('x-test-role', 'customer')
      .expect(403);
    await request(app)
      .get('/api/delivery-services')
      .set('x-test-role', 'seller')
      .expect(200);
    await request(app)
      .delete(`/api/delivery-services/${deliveryService._id}`)
      .expect(200);
    await expect(
      DeliveryServiceModel.findById(deliveryService._id),
    ).resolves.toBeNull();
  });
});
