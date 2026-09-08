jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, _res, next) => {
    req.user = { id: '65a4de97aff1fbb38c437952', role: 'admin' };
    next();
  },
}));

jest.mock('#middlewares/role.middleware.js', () => ({
  roleMiddleware: () => (_req, _res, next) => next(),
}));

jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    createObjectKey: jest.fn(() => 'brands/logos/generated.webp'),
    uploadObject: jest.fn(async ({ key }) => key),
    buildPublicUrl: jest.fn((key) => `https://cdn.example.com/${key}`),
    deleteObject: jest.fn(async () => undefined),
    getObjectKeyFromUrl: jest.fn(() => 'brands/logos/generated.webp'),
  },
}));

import express from 'express';
import sharp from 'sharp';
import request from 'supertest';

import { errorHandler } from '#middlewares/error.middleware.js';

import { BrandModel } from './brands.model.js';
import brandRoutes from './brands.route.js';

describe('Brand API', () => {
  let app;
  let logoBuffer;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', brandRoutes);
    app.use(errorHandler);
    logoBuffer = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#336699' },
    })
      .png()
      .toBuffer();
  });

  beforeEach(async () => {
    await BrandModel.deleteMany({});
  });

  test('creates a brand with an optional logo and generated slug', async () => {
    const response = await request(app)
      .post('/api/brands')
      .field('title', 'Royal Canin')
      .field('title_fa', 'رویال کنین')
      .attach('logo', logoBuffer, {
        filename: 'logo.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      title: 'Royal Canin',
      title_fa: 'رویال کنین',
      slug: 'royal-canin',
      isEnable: true,
      logo: 'https://cdn.example.com/brands/logos/generated.webp',
    });
    expect(response.body.data.thumbnailLogo).toContain(
      'data:image/webp;base64,',
    );
  });

  test('lists enabled brands and allows admins to change status', async () => {
    const brand = await BrandModel.create({
      title: 'Acme',
      title_fa: 'اکمی',
    });

    await request(app).patch(`/api/brands/${brand._id}/disable`).expect(200);
    await request(app)
      .get('/api/brands')
      .expect((response) => {
        expect(response.body.totalRecords).toBe(0);
      });
    await request(app)
      .get('/api/brands?includeDisabled=true')
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].isEnable).toBe(false);
      });
    await request(app).patch(`/api/brands/${brand._id}/enable`).expect(200);
    await request(app).get(`/api/brands/${brand._id}`).expect(200);
  });

  test('returns only enabled brands from the explicit enabled list endpoint', async () => {
    await BrandModel.create([
      { title: 'Enabled brand', title_fa: 'برند فعال', isEnable: true },
      { title: 'Disabled brand', title_fa: 'برند غیرفعال', isEnable: false },
    ]);

    const response = await request(app).get('/api/brands/enabled').expect(200);

    expect(response.body).toMatchObject({ totalRecords: 1 });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      title: 'Enabled brand',
      isEnable: true,
    });
  });

  test('validates required create fields and identifiers', async () => {
    await request(app)
      .post('/api/brands')
      .send({ title: 'Only title' })
      .expect(422);
    await request(app).get('/api/brands/not-an-object-id').expect(422);
  });

  test('deletes a brand', async () => {
    const brand = await BrandModel.create({
      title: 'Delete me',
      title_fa: 'حذف من',
    });

    await request(app).delete(`/api/brands/${brand._id}`).expect(200);
    await expect(BrandModel.findById(brand._id)).resolves.toBeNull();
  });
});
