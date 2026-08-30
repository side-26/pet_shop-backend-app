jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    void res;
    req.user = {
      id: '65a4de97aff1fbb38c437952',
      role:
        req.get('x-test-role') ||
        jest.requireActual('#configs/constants.js').ROLES.ADMIN,
    };
    next();
  },
}));

jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    createObjectKey: jest.fn(() => 'breeds/main/generated.webp'),
    uploadObject: jest.fn(async ({ key }) => key),
    buildPublicUrl: jest.fn((key) => `https://cdn.example.com/${key}`),
    deleteObject: jest.fn(async () => undefined),
    getObjectKeyFromUrl: jest.fn(() => 'breeds/main/previous.webp'),
  },
}));

import express from 'express';
import sharp from 'sharp';
import request from 'supertest';

import { ROLES, STATUES } from '#configs/constants.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import { BreedModel } from './breeds.model.js';
import breedRoutes from './breeds.route.js';

const breedData = {
  title: 'Persian Cat',
  country: 'Iran',
  ageAverage: '12-17 years',
  size: 2,
  activityLevel: null,
  enable: true,
};
const storedImageFields = {
  mainImage: 'https://cdn.example.com/breeds/main/fixture.webp',
  thumbnailImage: 'data:image/webp;base64,AAAA',
};

describe('Breed API', () => {
  let app;
  let imageBuffer;
  let petType;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', breedRoutes);
    app.use(errorHandler);
    imageBuffer = await sharp({
      create: {
        width: 100,
        height: 80,
        channels: 3,
        background: '#336699',
      },
    })
      .png()
      .toBuffer();
  });

  const multipartBreed = (requestBuilder, values, attachImage = true) => {
    let builder = requestBuilder;
    for (const [key, value] of Object.entries(values)) {
      builder = builder.field(key, value === null ? 'null' : String(value));
    }
    return attachImage
      ? builder.attach('mainImage', imageBuffer, {
          filename: 'breed.png',
          contentType: 'image/png',
        })
      : builder;
  };

  beforeEach(async () => {
    await Promise.all([BreedModel.deleteMany({}), PetTypeModel.deleteMany({})]);
    petType = await PetTypeModel.create({
      title: 'Cat',
      mainImage: 'https://cdn.example.com/pet-types/cat.webp',
      thumbnail: 'data:image/webp;base64,AAAA',
    });
    breedData.petType = petType._id.toString();
  });

  test('admin can create, read one, edit images, change status, paginate, and delete', async () => {
    const created = await multipartBreed(
      request(app).post('/api/breeds'),
      breedData,
    );
    expect(created.status).toBe(STATUES.CREATED);
    expect(created.body.data).toMatchObject({
      country: 'Iran',
      activityLevel: null,
      mainImage: 'https://cdn.example.com/breeds/main/generated.webp',
    });
    expect(created.body.data.thumbnailImage).toMatch(
      /^data:image\/webp;base64,/,
    );
    const id = created.body.data.id;

    expect((await request(app).get(`/api/breeds/${id}`)).status).toBe(
      STATUES.SUCCESS,
    );

    const propertyDefinitions = [{ label: 'رنگ', value: 'سفید' }];
    const range = await request(app)
      .put('/api/breeds/range')
      .send({ id, propertyDefinitions });
    expect(range.status).toBe(STATUES.SUCCESS);
    expect(range.body.data.propertyDefinitions).toEqual(propertyDefinitions);

    const definitions = await request(app).get(
      `/api/breeds/property-definitions/${id}`,
    );
    expect(definitions.status).toBe(STATUES.SUCCESS);
    expect(definitions.body.data).toEqual({ result: propertyDefinitions });

    const bySlug = await request(app).get('/api/breeds/slug/persian-cat');
    expect(bySlug.status).toBe(STATUES.SUCCESS);
    expect(bySlug.body.data.slug).toBe('persian-cat');

    const edited = await multipartBreed(request(app).put(`/api/breeds/${id}`), {
      ...breedData,
      title: 'British Shorthair',
      activityLevel: 1,
    });
    expect(edited.status).toBe(STATUES.SUCCESS);
    expect(edited.body.data.activityLevel).toBe(1);
    expect(edited.body.data.mainImage).toContain('/breeds/main/');

    expect((await request(app).patch(`/api/breeds/${id}/disable`)).status).toBe(
      STATUES.SUCCESS,
    );
    expect((await request(app).patch(`/api/breeds/${id}/enable`)).status).toBe(
      STATUES.SUCCESS,
    );
    expect(
      (await request(app).get('/api/breeds/paginate?limit=1')).status,
    ).toBe(STATUES.SUCCESS);
    expect((await request(app).delete(`/api/breeds/${id}`)).status).toBe(
      STATUES.SUCCESS,
    );
  });

  test('requires and validates the main image and breed properties', async () => {
    const missingImage = await multipartBreed(
      request(app).post('/api/breeds'),
      breedData,
      false,
    );
    expect(missingImage.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const invalidSize = await multipartBreed(request(app).post('/api/breeds'), {
      ...breedData,
      size: 5,
    });
    expect(invalidSize.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const nullable = await multipartBreed(request(app).post('/api/breeds'), {
      ...breedData,
      title: 'Siamese',
      country: null,
      activityLevel: null,
    });
    expect(nullable.status).toBe(STATUES.CREATED);
  });

  test('rejects unsupported and oversized main images', async () => {
    const unsupported = await request(app)
      .post('/api/breeds')
      .attach('mainImage', imageBuffer, {
        filename: 'breed.gif',
        contentType: 'image/gif',
      });
    expect(unsupported.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const oversized = await request(app)
      .post('/api/breeds')
      .attach('mainImage', Buffer.alloc(1024 * 1024), {
        filename: 'breed.png',
        contentType: 'image/png',
      });
    expect(oversized.status).toBe(STATUES.BAD_FORM_VALIDATION);
  });

  test('seller can read the non-paginated list but cannot access other breed actions', async () => {
    const breed = await BreedModel.create({
      ...breedData,
      ...storedImageFields,
    });
    const seller = { 'x-test-role': ROLES.SELLER };

    expect((await request(app).get('/api/breeds').set(seller)).status).toBe(
      STATUES.SUCCESS,
    );
    expect(
      (await request(app).get(`/api/breeds/${breed._id}`).set(seller)).status,
    ).toBe(STATUES.NO_ACCESS);
    expect(
      (
        await multipartBreed(
          request(app).post('/api/breeds').set(seller),
          breedData,
        )
      ).status,
    ).toBe(STATUES.NO_ACCESS);
  });
});
