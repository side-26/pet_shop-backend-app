jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    buildPublicUrl: jest.fn(),
    createObjectKey: jest.fn(),
    deleteObject: jest.fn(),
    getObjectKeyFromUrl: jest.fn(),
    uploadObject: jest.fn(),
  },
}));

import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';

import { STATUES } from '#configs/constants.js';
import { BreedModel } from '#entities/breeds/breeds.model.js';
import { CategoryModel } from '#entities/categories/categories.model.js';
import { BrandModel } from '#entities/brands/brands.model.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { ProductModel } from '#entities/products/products.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import landingRoutes from './landing.route.js';

describe('Landing API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use('/api', landingRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    const brand = await BrandModel.create({
      title: 'برند پیش‌فرض',
      title_fa: 'برند پیش‌فرض',
    });
    await PetTypeModel.create([
      ...Array.from({ length: 5 }, (_, index) => ({
        title: `نوع-${index}`,
        description: `خلاصه-${index}`,
        mainImage: `https://cdn.example.com/pet-${index}.webp`,
        thumbnail: 'data:image/webp;base64,AAAA',
      })),
      {
        title: 'غیرفعال',
        mainImage: 'https://cdn.example.com/disabled.webp',
        thumbnail: 'data:image/webp;base64,AAAA',
        isEnabled: false,
      },
    ]);
    await ProductModel.create(
      Array.from({ length: 5 }, (_, index) => ({
        title: `محصول-${index}`,
        mainImage: `https://cdn.example.com/product-${index}.webp`,
        mainImageThumbnail: 'data:image/webp;base64,AAAA',
        description: 'توضیحات محصول',
        summary: `خلاصه محصول-${index}`,
        category: new mongoose.Types.ObjectId(),
        brand: brand._id,
        quantity: 10,
        price: 100000,
        discountPercentage: index * 10,
        salesVolume: index * 5,
        slug: `product-${index}`,
      })),
    );
  });

  test('returns public landing sections with enabled records only', async () => {
    const [
      featuredPetTypes,
      allPetTypes,
      discounted,
      defaultDiscounted,
      popular,
      invalidLimit,
    ] = await Promise.all([
      request(app).get('/api/landing/pet-types'),
      request(app).get('/api/landing/pet-types/all'),
      request(app).get('/api/landing/products/discounted').query({ limit: 2 }),
      request(app).get('/api/landing/products/discounted'),
      request(app).get('/api/landing/products/popular'),
      request(app).get('/api/landing/products/discounted').query({
        limit: 101,
      }),
    ]);

    expect(featuredPetTypes.status).toBe(200);
    expect(featuredPetTypes.body.data).toHaveLength(4);
    expect(featuredPetTypes.body.data[0]).toEqual(
      expect.objectContaining({
        title: 'نوع-0',
        mainImage: expect.any(String),
        thumbnail: expect.any(String),
      }),
    );
    expect(allPetTypes.body.data).toHaveLength(5);
    expect(allPetTypes.body.data[0].thumbnail).toBe(
      'data:image/webp;base64,AAAA',
    );
    expect(
      discounted.body.data.map(({ discountPercentage }) => discountPercentage),
    ).toEqual([40, 30]);
    expect(
      discounted.body.data.map(({ discountPrice }) => discountPrice),
    ).toEqual([40000, 30000]);
    expect(discounted.body.data[0].mainImageThumbnail).toBe(
      'data:image/webp;base64,AAAA',
    );
    expect(defaultDiscounted.body.data).toHaveLength(4);
    expect(popular.body.data.map(({ title }) => title)).toEqual([
      'محصول-4',
      'محصول-3',
      'محصول-2',
      'محصول-1',
    ]);
    expect(invalidLimit.status).toBe(STATUES.BAD_FORM_VALIDATION);
  });

  test('returns full enabled pet and product details by slug', async () => {
    const petType = await PetTypeModel.create({
      title: 'سگ',
      mainImage: 'https://cdn.example.com/dog.webp',
      thumbnail: 'data:image/webp;base64,AAAA',
    });
    const breed = await BreedModel.create({
      title: 'هاسکی',
      petType: petType._id,
      country: null,
      ageAverage: '12 سال',
      size: 3,
      activityLevel: null,
      mainImage: 'https://cdn.example.com/husky.webp',
      thumbnailImage: 'data:image/webp;base64,AAAA',
      enable: true,
    });
    const category = await CategoryModel.create({
      title: 'غذا',
      petType: petType._id,
      mainImage: 'https://cdn.example.com/food-category.webp',
      mainThumbnailImage: 'data:image/webp;base64,AAAA',
    });
    const subCategory = await SubCategoryModel.create({
      title: 'غذای خشک',
      category: category._id,
    });
    const brand = await BrandModel.create({
      title: 'برند غذای سگ',
      title_fa: 'برند غذای سگ',
    });
    await PetModel.create({
      title: 'هاسکی جوان',
      mainImage: 'https://cdn.example.com/husky-young.webp',
      mainImageThumbnail: 'data:image/webp;base64,AAAA',
      description: 'توضیحات هاسکی',
      petType: petType._id,
      breed: breed._id,
      inEnable: true,
      slug: 'young-husky',
    });
    await PetModel.create({
      title: 'هاسکی غیرفعال',
      mainImage: 'https://cdn.example.com/hidden-husky.webp',
      mainImageThumbnail: 'data:image/webp;base64,AAAA',
      description: 'توضیحات هاسکی غیرفعال',
      petType: petType._id,
      breed: breed._id,
      inEnable: false,
      slug: 'hidden-husky',
    });
    await ProductModel.create({
      title: 'غذای سگ',
      mainImage: 'https://cdn.example.com/dog-food.webp',
      mainImageThumbnail: 'data:image/webp;base64,AAAA',
      description: 'توضیحات غذای سگ',
      category: category._id,
      brand: brand._id,
      subCategory: subCategory._id,
      slug: 'dog-food',
    });

    const [petResponse, productResponse, hiddenPetResponse, invalidResponse] =
      await Promise.all([
        request(app).get('/api/landing/pets/young-husky'),
        request(app).get('/api/landing/products/dog-food'),
        request(app).get('/api/landing/pets/hidden-husky'),
        request(app).get('/api/landing/pets/invalid_slug'),
      ]);

    expect(petResponse.status).toBe(200);
    expect(petResponse.body.data).toEqual(
      expect.objectContaining({
        slug: 'young-husky',
        petType: expect.objectContaining({ title: 'سگ' }),
        breed: expect.objectContaining({ title: 'هاسکی' }),
      }),
    );
    expect(productResponse.status).toBe(200);
    expect(productResponse.body.data).toEqual(
      expect.objectContaining({
        slug: 'dog-food',
        category: expect.objectContaining({ title: 'غذا' }),
        brand: expect.objectContaining({ title: 'برند غذای سگ' }),
        subCategory: expect.objectContaining({ title: 'غذای خشک' }),
      }),
    );
    expect(hiddenPetResponse.status).toBe(404);
    expect(invalidResponse.status).toBe(STATUES.BAD_FORM_VALIDATION);
  });
});
