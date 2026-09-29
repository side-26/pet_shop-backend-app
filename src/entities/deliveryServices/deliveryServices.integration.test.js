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
    originCoordinates: [51.389, 35.6892],
    basePrice: 10000,
    packingPrice: 3000,
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

  test('updates the complete provider contract and changes availability', async () => {
    const deliveryService = await DeliveryServiceModel.create(payload);
    const updatedPayload = {
      ...payload,
      title: 'Updated Express',
      title_fa: 'اکسپرس به‌روز',
      originCoordinates: [51.4, 35.7],
      basePrice: 20000,
      packingPrice: 4000,
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
