import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';

import { ProductModel } from '#entities/products/products.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
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
    await Promise.all([
      ProductModel.deleteMany({}),
      PetTypeModel.deleteMany({}),
    ]);
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
        quantity: 10,
        price: 100000,
        discountPercentage: index * 10,
        salesVolume: index * 5,
        slug: `product-${index}`,
      })),
    );
  });

  test('returns public landing sections with enabled records only', async () => {
    const [featuredPetTypes, allPetTypes, discounted, popular] =
      await Promise.all([
        request(app).get('/api/landing/pet-types'),
        request(app).get('/api/landing/pet-types/all'),
        request(app).get('/api/landing/products/discounted'),
        request(app).get('/api/landing/products/popular'),
      ]);

    expect(featuredPetTypes.status).toBe(200);
    expect(featuredPetTypes.body.data).toHaveLength(4);
    expect(featuredPetTypes.body.data[0]).toEqual(
      expect.objectContaining({
        title: 'نوع-0',
        mainImage: expect.any(String),
      }),
    );
    expect(allPetTypes.body.data).toHaveLength(5);
    expect(
      discounted.body.data.map(({ discountPercentage }) => discountPercentage),
    ).toEqual([40, 30, 20, 10]);
    expect(popular.body.data.map(({ title }) => title)).toEqual([
      'محصول-4',
      'محصول-3',
      'محصول-2',
      'محصول-1',
    ]);
  });
});
