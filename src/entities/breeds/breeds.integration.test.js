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

import express from 'express';
import request from 'supertest';

import { ROLES, STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import { BreedModel } from './breeds.model.js';
import breedRoutes from './breeds.route.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

const breedData = {
  title: 'Persian Cat',
  country: 'Iran',
  ageAverage: '12-17 years',
  size: 2,
  activityLevel: null,
  enable: true,
};

describe('Breed API', () => {
  let app;
  let petType;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', breedRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await Promise.all([BreedModel.deleteMany({}), PetTypeModel.deleteMany({})]);
    petType = await PetTypeModel.create({ title: 'Cat' });
    breedData.petType = petType._id.toString();
  });

  test('admin can create, read one, edit, change status, paginate, and delete', async () => {
    const created = await request(app).post('/api/breeds').send(breedData);
    expect(created.status).toBe(STATUES.CREATED);
    expect(created.body.data.country).toBe('Iran');
    expect(created.body.data.activityLevel).toBeNull();
    const id = created.body.data.id;

    expect((await request(app).get(`/api/breeds/${id}`)).status).toBe(
      STATUES.SUCCESS,
    );

    const edited = await request(app)
      .put(`/api/breeds/${id}`)
      .send({ ...breedData, title: 'British Shorthair', activityLevel: 1 });
    expect(edited.status).toBe(STATUES.SUCCESS);
    expect(edited.body.data.activityLevel).toBe(1);

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

  test('validates required properties, nullable fields, and enum levels', async () => {
    const missingTitle = await request(app)
      .post('/api/breeds')
      .send({
        ...breedData,
        title: undefined,
      });
    expect(missingTitle.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const invalidSize = await request(app)
      .post('/api/breeds')
      .send({ ...breedData, size: 5 });
    expect(invalidSize.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const nullable = await request(app)
      .post('/api/breeds')
      .send({
        ...breedData,
        title: 'Siamese',
        country: null,
        activityLevel: null,
      });
    expect(nullable.status).toBe(STATUES.CREATED);
  });

  test('seller can read the non-paginated list but cannot access other breed actions', async () => {
    const breed = await BreedModel.create(breedData);
    const seller = { 'x-test-role': ROLES.SELLER };

    expect((await request(app).get('/api/breeds').set(seller)).status).toBe(
      STATUES.SUCCESS,
    );

    expect(
      (await request(app).get(`/api/breeds/${breed._id}`).set(seller)).status,
    ).toBe(STATUES.NO_ACCESS);
    expect(
      (await request(app).post('/api/breeds').set(seller).send(breedData))
        .status,
    ).toBe(STATUES.NO_ACCESS);
  });
});
