jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    void res;
    req.user = {
      userId: '65a4de97aff1fbb38c437952',
      role:
        req.get('x-test-role') ||
        jest.requireActual('#configs/constants.js').ROLES.ADMIN,
    };
    next();
  },
}));

import express from 'express';
import request from 'supertest';

import { ERROR_CODES, ROLES, STATUES } from '#configs/constants.js';
import { BreedModel } from '#entities/breeds/breeds.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import { PetModel } from './pets.model.js';
import petRoutes from './pets.route.js';

const basePetData = {
  title: 'Persian kitten',
  mainImage: 'https://cdn.example.com/pets/main.webp',
  images: ['https://cdn.example.com/pets/one.webp'],
  mainImageThumbnail: 'https://cdn.example.com/pets/thumb.webp',
  summary: 'A friendly kitten',
  description: 'A healthy and friendly Persian kitten.',
  quantity: 2,
  price: 12000000,
  discountPercentage: 10,
  enable: true,
  slug: 'persian-kitten',
};

describe('Pet API', () => {
  let app;
  let catType;
  let dogType;
  let catBreed;
  let dogBreed;
  let petData;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', petRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await Promise.all([
      PetModel.deleteMany({}),
      BreedModel.deleteMany({}),
      PetTypeModel.deleteMany({}),
    ]);
    [catType, dogType] = await PetTypeModel.create([
      { title: 'Cat' },
      { title: 'Dog' },
    ]);
    [catBreed, dogBreed] = await BreedModel.create([
      {
        title: 'Persian',
        petType: catType._id,
        country: 'Iran',
        ageAverage: '12-17',
        size: 2,
        activityLevel: 2,
        enable: true,
      },
      {
        title: 'Shepherd',
        petType: dogType._id,
        country: 'Germany',
        ageAverage: '9-13',
        size: 4,
        activityLevel: 4,
        enable: true,
      },
    ]);
    petData = {
      ...basePetData,
      petType: catType._id.toString(),
      breed: catBreed._id.toString(),
    };
  });

  test('creates a valid pet and applies numeric defaults', async () => {
    const response = await request(app)
      .post('/api/pets')
      .send({
        ...petData,
        quantity: undefined,
        price: undefined,
        discountPercentage: undefined,
      });

    expect(response.status).toBe(STATUES.CREATED);
    expect(response.body.data).toMatchObject({
      quantity: 0,
      price: 0,
      discountPercentage: 0,
    });
    const saved = await PetModel.findById(response.body.data.id);
    expect(saved.mainImage).toBe(basePetData.mainImage);
  });

  test('rejects missing required fields and invalid percentages', async () => {
    const missing = await request(app)
      .post('/api/pets')
      .send({ ...petData, title: undefined });
    expect(missing.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const percentage = await request(app)
      .post('/api/pets')
      .send({ ...petData, discountPercentage: 101 });
    expect(percentage.status).toBe(STATUES.BAD_FORM_VALIDATION);
  });

  test('rejects invalid PetType, invalid Breed, and mismatched relations', async () => {
    const missingId = '65a4de97aff1fbb38c437999';
    const invalidType = await request(app)
      .post('/api/pets')
      .send({ ...petData, petType: missingId });
    expect(invalidType.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const invalidBreed = await request(app)
      .post('/api/pets')
      .send({ ...petData, breed: missingId });
    expect(invalidBreed.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const mismatch = await request(app)
      .post('/api/pets')
      .send({ ...petData, breed: dogBreed._id.toString() });
    expect(mismatch.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(mismatch.body.message).toContain('متعلق');
  });

  test('seller can update, edit, enable, disable, read, and paginate', async () => {
    const pet = await PetModel.create(petData);
    const seller = { 'x-test-role': ROLES.SELLER };

    const updated = await request(app)
      .put(`/api/pets/${pet._id}`)
      .set(seller)
      .send({ title: 'Updated kitten' });
    expect(updated.status).toBe(STATUES.SUCCESS);

    const edited = await request(app)
      .patch(`/api/pets/${pet._id}`)
      .set(seller)
      .send({ price: 14000000 });
    expect(edited.status).toBe(STATUES.SUCCESS);
    expect(edited.body.data.price).toBe(14000000);

    expect(
      (await request(app).patch(`/api/pets/${pet._id}/disable`).set(seller))
        .body.data.enable,
    ).toBe(false);
    expect(
      (await request(app).patch(`/api/pets/${pet._id}/enable`).set(seller)).body
        .data.enable,
    ).toBe(true);
    expect(
      (await request(app).get(`/api/pets/manage/${pet._id}`).set(seller))
        .status,
    ).toBe(STATUES.SUCCESS);
    const list = await request(app)
      .get('/api/pets/get-full-info-paginate-list')
      .set(seller);
    expect(list.status).toBe(STATUES.SUCCESS);
    expect(list.body.pagination.totalItems).toBe(1);
    expect(list.body.data[0].images).toEqual(basePetData.images);
  });

  test('validates breed/type compatibility during partial updates', async () => {
    const pet = await PetModel.create(petData);
    const response = await request(app)
      .patch(`/api/pets/${pet._id}`)
      .send({ breed: dogBreed._id.toString() });
    expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(response.body.message).toContain('متعلق');
  });

  test('seller cannot delete while admin can delete', async () => {
    const pet = await PetModel.create(petData);
    const sellerResponse = await request(app)
      .delete(`/api/pets/${pet._id}`)
      .set('x-test-role', ROLES.SELLER);
    expect(sellerResponse.status).toBe(STATUES.NO_ACCESS);
    expect(await PetModel.findById(pet._id)).not.toBeNull();

    const adminResponse = await request(app).delete(`/api/pets/${pet._id}`);
    expect(adminResponse.status).toBe(STATUES.SUCCESS);
    expect(await PetModel.findById(pet._id)).toBeNull();
  });

  test('customer list hides images and reduces relations to titles', async () => {
    await PetModel.create(petData);
    await PetModel.create({
      ...petData,
      title: 'Hidden kitten',
      slug: 'hidden-kitten',
      enable: false,
    });

    const response = await request(app).get('/api/pets');
    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).not.toHaveProperty('images');
    expect(response.body.data[0].petType).toBe('Cat');
    expect(response.body.data[0].breed).toBe('Persian');
  });

  test('customer detail expands relations and includes images', async () => {
    const pet = await PetModel.create(petData);
    const response = await request(app).get(`/api/pets/customer/${pet._id}`);
    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data.images).toEqual(basePetData.images);
    expect(response.body.data.petType).toMatchObject({ title: 'Cat' });
    expect(response.body.data.breed).toMatchObject({ title: 'Persian' });
  });

  test('customer detail does not expose disabled pets', async () => {
    const pet = await PetModel.create({ ...petData, enable: false });
    const response = await request(app).get(`/api/pets/customer/${pet._id}`);
    expect(response.status).toBe(STATUES.NOT_FOUND);
    expect(response.body.message).toBe('حیوان یافت نشد');
    expect(ERROR_CODES.PET_NOT_FOUND).toBe('PET_NOT_FOUND');
  });
});
