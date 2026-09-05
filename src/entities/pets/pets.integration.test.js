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

jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    createObjectKey: jest.fn(() => 'pets/main/generated.webp'),
    uploadObject: jest.fn(async ({ key }) => key),
    buildPublicUrl: jest.fn((key) => `https://cdn.example.com/${key}`),
    deleteObject: jest.fn(async () => undefined),
    getObjectKeyFromUrl: jest.fn(() => 'pets/main/previous.webp'),
  },
}));

import express from 'express';
import sharp from 'sharp';
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
  mainImageThumbnail: 'data:image/webp;base64,AAAA',
  summary: 'A friendly kitten',
  description: 'A healthy and friendly Persian kitten.',
  quantity: 2,
  price: 12000000,
  discountPercentage: 10,
  inEnable: true,
  slug: 'persian-kitten',
};

const breedImageFields = {
  mainImage: 'https://cdn.example.com/breeds/main/fixture.webp',
  thumbnailImage: 'data:image/webp;base64,AAAA',
};

describe('Pet API', () => {
  let app;
  let catType;
  let dogType;
  let catBreed;
  let dogBreed;
  let petData;
  let imageBuffer;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', petRoutes);
    app.use(errorHandler);
    imageBuffer = await sharp({
      create: {
        width: 100,
        height: 80,
        channels: 3,
        background: '#996633',
      },
    })
      .png()
      .toBuffer();
  });

  const multipartPet = (requestBuilder, values, galleryImages = []) => {
    let form = requestBuilder;
    for (const [field, value] of Object.entries(values)) {
      if (
        value === undefined ||
        field === 'mainImage' ||
        field === 'mainImageThumbnail' ||
        field === 'images'
      ) {
        continue;
      }
      for (const item of Array.isArray(value) ? value : [value]) {
        form = form.field(field, String(item));
      }
    }
    form = form.attach('mainImage', imageBuffer, {
      filename: 'pet.png',
      contentType: 'image/png',
    });
    for (const [index, galleryImage] of galleryImages.entries()) {
      form = form.attach('images', galleryImage, {
        filename: `pet-gallery-${index}.png`,
        contentType: 'image/png',
      });
    }
    return form;
  };

  beforeEach(async () => {
    await Promise.all([
      PetModel.deleteMany({}),
      BreedModel.deleteMany({}),
      PetTypeModel.deleteMany({}),
    ]);
    [catType, dogType] = await PetTypeModel.create([
      {
        title: 'Cat',
        mainImage: 'https://cdn.example.com/pet-types/cat.webp',
        thumbnail: 'data:image/webp;base64,AAAA',
      },
      {
        title: 'Dog',
        mainImage: 'https://cdn.example.com/pet-types/dog.webp',
        thumbnail: 'data:image/webp;base64,AAAA',
      },
    ]);
    [catBreed, dogBreed] = await BreedModel.create([
      {
        ...breedImageFields,
        title: 'Persian',
        petType: catType._id,
        country: 'Iran',
        ageAverage: '12-17',
        size: 2,
        activityLevel: 2,
        enable: true,
      },
      {
        ...breedImageFields,
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
    const response = await multipartPet(
      request(app).post('/api/pets'),
      {
        ...petData,
        quantity: undefined,
        price: undefined,
        discountPercentage: undefined,
        salesVolume: 99,
      },
      [imageBuffer, imageBuffer],
    );

    expect(response.status).toBe(STATUES.CREATED);
    expect(response.body.data).toMatchObject({
      quantity: 0,
      price: 0,
      discountPercentage: 0,
    });
    const saved = await PetModel.findById(response.body.data.id);
    expect(saved.salesVolume).toBe(0);
    expect(saved.mainImage).toMatch(/^https:\/\/cdn\.example\.com\//);
    expect(saved.mainImageThumbnail).toMatch(/^data:image\/webp;base64,/);
    expect(Buffer.byteLength(saved.mainImageThumbnail)).toBeLessThan(10 * 1024);
    expect(saved.images).toEqual([
      'https://cdn.example.com/pets/main/generated.webp',
      'https://cdn.example.com/pets/main/generated.webp',
    ]);
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

  test('seller can update pet sections, toggle status, read, and paginate', async () => {
    const pet = await PetModel.create({ ...petData, salesVolume: 13 });
    const seller = { 'x-test-role': ROLES.SELLER };

    const updated = await request(app)
      .put(`/api/pets/${pet._id}`)
      .set(seller)
      .send({ title: 'Updated kitten', salesVolume: 99 });
    expect(updated.status).toBe(STATUES.SUCCESS);
    expect(updated.body.data.title).toBe('Updated kitten');
    expect(updated.body.data).not.toHaveProperty('price');
    expect(updated.body.data).not.toHaveProperty('salesVolume');

    const imageUpdated = await request(app)
      .put(`/api/pets/${pet._id}/images`)
      .set(seller)
      .attach('mainImage', imageBuffer, {
        filename: 'replacement.png',
        contentType: 'image/png',
      })
      .attach('images', imageBuffer, {
        filename: 'replacement-gallery.png',
        contentType: 'image/png',
      });
    expect(imageUpdated.status).toBe(STATUES.SUCCESS);
    expect(imageUpdated.body.data.mainImageThumbnail).toMatch(
      /^data:image\/webp;base64,/,
    );
    expect(imageUpdated.body.data.mainImageThumbnail).not.toBe(
      petData.mainImageThumbnail,
    );
    expect(imageUpdated.body.data.imagesList).toEqual([
      'https://cdn.example.com/pets/main/generated.webp',
    ]);

    const priceUpdated = await request(app)
      .put(`/api/pets/${pet._id}/price`)
      .set(seller)
      .send({ price: 14000000, discountPercentage: 15 });
    expect(priceUpdated.status).toBe(STATUES.SUCCESS);
    expect(priceUpdated.body.data).toEqual({
      price: 14000000,
      discountPercentage: 15,
    });

    const images = await request(app)
      .get(`/api/pets/${pet._id}/images`)
      .set(seller);
    expect(images.status).toBe(STATUES.SUCCESS);
    expect(images.body.data.imagesList).toEqual([
      'https://cdn.example.com/pets/main/generated.webp',
    ]);

    const price = await request(app)
      .get(`/api/pets/${pet._id}/price`)
      .set(seller);
    expect(price.status).toBe(STATUES.SUCCESS);
    expect(price.body.data).toEqual({
      price: 14000000,
      discountPercentage: 15,
    });

    const baseInfo = await request(app)
      .get(`/api/pets/${pet._id}/base-info`)
      .set(seller);
    expect(baseInfo.status).toBe(STATUES.SUCCESS);
    expect(baseInfo.body.data).toMatchObject({
      title: 'Updated kitten',
      quantity: petData.quantity,
      petType: { title: 'Cat' },
      breed: { title: 'Persian' },
    });

    expect(
      (await request(app).patch(`/api/pets/${pet._id}/disable`).set(seller))
        .body.data.inEnable,
    ).toBe(false);
    expect(
      (await request(app).patch(`/api/pets/${pet._id}/enable`).set(seller)).body
        .data.inEnable,
    ).toBe(true);
    expect(
      (await request(app).get(`/api/pets/manage/${pet._id}`).set(seller))
        .status,
    ).toBe(STATUES.SUCCESS);
    const list = await request(app).get('/api/pets/paginate').set(seller);
    expect(list.status).toBe(STATUES.SUCCESS);
    expect(list.body).toMatchObject({
      isSuccess: true,
      data: {
        result: expect.any(Array),
        pagination: expect.objectContaining({ totalItems: 1 }),
      },
    });
    expect(list.body).not.toHaveProperty('pagination');
    expect(list.body.data.result[0].images).toEqual([
      'https://cdn.example.com/pets/main/generated.webp',
    ]);
    expect(list.body.data.result[0]).toHaveProperty('salesVolume', 13);
    const managementDetail = await request(app)
      .get(`/api/pets/manage/${pet._id}`)
      .set(seller);
    expect(managementDetail.body.data).not.toHaveProperty('salesVolume');

    await PetModel.create({
      ...petData,
      title: 'Persian adult',
      quantity: 7,
      inEnable: false,
      slug: 'persian-adult',
    });
    const filteredList = await request(app)
      .get('/api/pets/paginate')
      .query({
        title: 'adult',
        petType: catType._id.toString(),
        breed: catBreed._id.toString(),
        quantity: 7,
        isEnable: false,
      })
      .set(seller);
    expect(filteredList.status).toBe(STATUES.SUCCESS);
    expect(filteredList.body.data.pagination.totalItems).toBe(1);
    expect(filteredList.body.data.result[0]).toMatchObject({
      title: 'Persian adult',
      quantity: 7,
      inEnable: false,
    });

    expect(
      (await request(app).get('/api/pets/get-full-info-paginate-list')).status,
    ).toBe(STATUES.NOT_FOUND);
    expect(
      (await request(app).patch(`/api/pets/${pet._id}`).send({ quantity: 1 }))
        .status,
    ).toBe(STATUES.NOT_FOUND);
  });

  test('validates breed/type compatibility during partial updates', async () => {
    const pet = await PetModel.create(petData);
    const response = await request(app)
      .put(`/api/pets/${pet._id}`)
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
      inEnable: false,
    });

    const response = await request(app).get('/api/pets');
    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data.result).toHaveLength(1);
    expect(response.body.data.pagination.totalItems).toBe(1);
    expect(response.body.data.result[0]).not.toHaveProperty('images');
    expect(response.body.data.result[0].petType).toBe('Cat');
    expect(response.body.data.result[0].breed).toBe('Persian');
  });

  test('customer pagination returns full enabled pet data with public filters', async () => {
    await PetModel.create(petData);
    await PetModel.create({
      ...petData,
      title: 'Budget Persian',
      price: 500,
      slug: 'budget-persian',
    });
    await PetModel.create({
      ...petData,
      title: 'Hidden Persian',
      price: 500,
      inEnable: false,
      slug: 'hidden-persian',
    });

    const response = await request(app)
      .get('/api/pets/customer/paginate')
      .query({
        title: 'budget',
        petType: catType._id.toString(),
        breed: catBreed._id.toString(),
        priceRange: '400-600',
      });
    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data.pagination.totalItems).toBe(1);
    expect(response.body.data.result[0]).toMatchObject({
      title: 'Budget Persian',
      price: 500,
      images: basePetData.images,
      inEnable: true,
      petType: { title: 'Cat' },
      breed: { title: 'Persian' },
    });
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
    const pet = await PetModel.create({ ...petData, inEnable: false });
    const response = await request(app).get(`/api/pets/customer/${pet._id}`);
    expect(response.status).toBe(STATUES.NOT_FOUND);
    expect(response.body.message).toBe('حیوان یافت نشد');
    expect(ERROR_CODES.PET_NOT_FOUND).toBe('PET_NOT_FOUND');
  });
});
