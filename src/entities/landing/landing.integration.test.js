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

import {
  CART_PAYMENT_TYPES,
  ROLES,
  STATUES,
  USER_ITEM_TYPES,
} from '#configs/constants.js';
import { BreedModel } from '#entities/breeds/breeds.model.js';
import { CategoryModel } from '#entities/categories/categories.model.js';
import { BrandModel } from '#entities/brands/brands.model.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { ProductModel } from '#entities/products/products.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';
import { UserModel } from '#entities/users/users.model.js';
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
    const pets = await PetModel.create(
      Array.from({ length: 5 }, (_, index) => ({
        title: `حیوان-${index}`,
        mainImage: `https://cdn.example.com/pet-${index}.webp`,
        mainImageThumbnail: 'data:image/webp;base64,AAAA',
        description: 'توضیحات حیوان',
        petType: new mongoose.Types.ObjectId(),
        breed: new mongoose.Types.ObjectId(),
        salesVolume: index * 5,
        inEnable: true,
        slug: `pet-${index}`,
      })),
    );
    await UserModel.create([
      {
        phoneNumber: '09120000001',
        password: 'password123',
        wishlist: [
          { item: pets[0]._id, itemType: USER_ITEM_TYPES.PET },
          { item: pets[1]._id, itemType: USER_ITEM_TYPES.PET },
        ],
      },
      {
        phoneNumber: '09120000002',
        password: 'password123',
        wishlist: [{ item: pets[0]._id, itemType: USER_ITEM_TYPES.PET }],
      },
      {
        phoneNumber: '09120000003',
        password: 'password123',
        role: ROLES.ADMIN,
        wishlist: [{ item: pets[4]._id, itemType: USER_ITEM_TYPES.PET }],
      },
    ]);
  });

  test('returns public landing sections with enabled records only', async () => {
    const [
      featuredPetTypes,
      allPetTypes,
      discounted,
      defaultDiscounted,
      popular,
      popularPets,
      invalidLimit,
    ] = await Promise.all([
      request(app).get('/api/landing/pet-types'),
      request(app).get('/api/landing/pet-types/all'),
      request(app).get('/api/landing/products/discounted').query({ limit: 2 }),
      request(app).get('/api/landing/products/discounted'),
      request(app).get('/api/landing/products/popular'),
      request(app).get('/api/landing/pets/popular'),
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
    expect(allPetTypes.body.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'غیرفعال' })]),
    );
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
    expect(popular.body.data.map(({ slug }) => slug)).toEqual([
      'product-4',
      'product-3',
      'product-2',
      'product-1',
    ]);
    expect(popular.body.data.map(({ discountPrice }) => discountPrice)).toEqual(
      [60000, 70000, 80000, 90000],
    );
    expect(popularPets.body.data.map(({ title }) => title)).toEqual([
      'حیوان-0',
      'حیوان-1',
      'حیوان-2',
      'حیوان-3',
      'حیوان-4',
    ]);
    expect(popularPets.body.data[0]).toEqual(
      expect.objectContaining({
        mainImage: expect.any(String),
        mainImageThumbnail: expect.any(String),
      }),
    );
    expect(invalidLimit.status).toBe(STATUES.BAD_FORM_VALIDATION);
  });

  test('never returns disabled records from public landing routes', async () => {
    const hiddenProduct = await ProductModel.create({
      title: 'محصول پنهان',
      mainImage: 'https://cdn.example.com/hidden-product.webp',
      mainImageThumbnail: 'data:image/webp;base64,AAAA',
      description: 'توضیحات محصول پنهان',
      summary: 'خلاصه محصول پنهان',
      category: new mongoose.Types.ObjectId(),
      brand: new mongoose.Types.ObjectId(),
      quantity: 10,
      price: 1,
      discountPercentage: 100,
      salesVolume: 10_000,
      isEnable: false,
      slug: 'hidden-product',
    });
    const hiddenPet = await PetModel.create({
      title: 'حیوان پنهان',
      mainImage: 'https://cdn.example.com/hidden-pet.webp',
      mainImageThumbnail: 'data:image/webp;base64,AAAA',
      description: 'توضیحات حیوان پنهان',
      petType: new mongoose.Types.ObjectId(),
      breed: new mongoose.Types.ObjectId(),
      price: 10_000_000,
      salesVolume: 10_000,
      inEnable: false,
      slug: 'hidden-pet',
    });
    await UserModel.create({
      phoneNumber: '09120000004',
      password: 'password123',
      wishlist: [
        { item: hiddenProduct._id, itemType: USER_ITEM_TYPES.PRODUCT },
        { item: hiddenPet._id, itemType: USER_ITEM_TYPES.PET },
      ],
    });

    const [
      discountedProducts,
      popularProducts,
      featuredProducts,
      popularPets,
      hiddenProductDetail,
      hiddenPetDetail,
    ] = await Promise.all([
      request(app).get('/api/landing/products/discounted'),
      request(app).get('/api/landing/products/popular'),
      request(app).get('/api/landing/products/featured'),
      request(app).get('/api/landing/pets/popular'),
      request(app).get('/api/landing/products/hidden-product'),
      request(app).get('/api/landing/pets/hidden-pet'),
    ]);

    const productIds = (response) =>
      response.body.data.map(({ id }) => String(id));

    expect(productIds(discountedProducts)).not.toContain(
      String(hiddenProduct._id),
    );
    expect(productIds(popularProducts)).not.toContain(
      String(hiddenProduct._id),
    );
    expect(
      featuredProducts.body.data.map(({ product }) => String(product.id)),
    ).not.toContain(String(hiddenProduct._id));
    expect(popularPets.body.data.map(({ id }) => String(id))).not.toContain(
      String(hiddenPet._id),
    );
    expect(hiddenProductDetail.status).toBe(STATUES.NOT_FOUND);
    expect(hiddenPetDetail.status).toBe(STATUES.NOT_FOUND);
  });

  test('filters, sorts, and paginates enabled landing products', async () => {
    const [matchingBrand, otherBrand] = await BrandModel.create([
      { title: 'برند فیلتر', title_fa: 'برند فیلتر' },
      { title: 'برند دیگر', title_fa: 'برند دیگر' },
    ]);
    const category = new mongoose.Types.ObjectId();
    const subCategory = new mongoose.Types.ObjectId();
    await ProductModel.create([
      {
        title: 'محصول کم‌قیمت',
        mainImage: 'https://cdn.example.com/filtered-low.webp',
        mainImageThumbnail: 'data:image/webp;base64,AAAA',
        description: 'توضیحات محصول',
        category,
        subCategory,
        brand: matchingBrand._id,
        price: 100,
        salesVolume: 10,
        slug: 'filtered-low',
      },
      {
        title: 'محصول گران‌قیمت',
        mainImage: 'https://cdn.example.com/filtered-high.webp',
        mainImageThumbnail: 'data:image/webp;base64,AAAA',
        description: 'توضیحات محصول',
        category,
        subCategory,
        brand: matchingBrand._id,
        price: 300,
        salesVolume: 20,
        slug: 'filtered-high',
      },
      {
        title: 'محصول برند دیگر',
        mainImage: 'https://cdn.example.com/other-brand.webp',
        mainImageThumbnail: 'data:image/webp;base64,AAAA',
        description: 'توضیحات محصول',
        category,
        subCategory,
        brand: otherBrand._id,
        price: 200,
        salesVolume: 30,
        slug: 'other-brand',
      },
      {
        title: 'محصول غیرفعال',
        mainImage: 'https://cdn.example.com/disabled-filtered.webp',
        mainImageThumbnail: 'data:image/webp;base64,AAAA',
        description: 'توضیحات محصول',
        category,
        subCategory,
        brand: matchingBrand._id,
        price: 50,
        salesVolume: 100,
        isEnable: false,
        slug: 'disabled-filtered',
      },
    ]);

    const [response, mostSales, invalidRange] = await Promise.all([
      request(app)
        .get('/api/landing/products')
        .query({
          category: String(category),
          subCategory: String(subCategory),
          brand: String(matchingBrand._id),
          priceFrom: 100,
          priceTo: 300,
          sort: 'less-valued',
          page: 1,
          limit: 1,
        }),
      request(app)
        .get('/api/landing/products')
        .query({
          category: String(category),
          brand: String(matchingBrand._id),
          sort: 'most-sales',
        }),
      request(app).get('/api/landing/products').query({
        priceFrom: 300,
        priceTo: 100,
      }),
    ]);

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data.result.map(({ slug }) => slug)).toEqual([
      'filtered-low',
    ]);
    expect(response.body.data.pagination).toEqual({
      currentPage: 1,
      totalPages: 2,
      totalItems: 2,
      itemsPerPage: 1,
      hasNextPage: true,
      hasPrevPage: false,
      nextPage: 2,
      prevPage: null,
    });
    expect(response.body.data.result[0]).toEqual(
      expect.objectContaining({ discountPrice: 100, slug: 'filtered-low' }),
    );
    expect(mostSales.body.data.result.map(({ slug }) => slug)).toEqual([
      'filtered-high',
      'filtered-low',
    ]);
    expect(invalidRange.status).toBe(STATUES.BAD_FORM_VALIDATION);
  });

  test('returns five enabled brands with the most enabled products', async () => {
    const baseBrand = await BrandModel.findOne({ title: 'برند پیش‌فرض' });
    const [secondBrand, thirdBrand, fourthBrand, fifthBrand, hiddenBrand] =
      await BrandModel.create([
        { title: 'brand-two', title_fa: 'برند دو' },
        { title: 'brand-three', title_fa: 'برند سه' },
        { title: 'brand-four', title_fa: 'برند چهار' },
        { title: 'brand-five', title_fa: 'برند پنج' },
        { title: 'brand-hidden', title_fa: 'برند پنهان', isEnable: false },
      ]);
    const createProducts = (brand, count, prefix, isEnable = true) =>
      Array.from({ length: count }, (_, index) => ({
        title: `${prefix}-${index}`,
        mainImage: `https://cdn.example.com/${prefix}-${index}.webp`,
        mainImageThumbnail: 'data:image/webp;base64,AAAA',
        description: 'توضیحات محصول',
        category: new mongoose.Types.ObjectId(),
        brand: brand._id,
        quantity: 10,
        isEnable,
        slug: `${prefix}-${index}`,
      }));
    await ProductModel.create([
      ...createProducts(secondBrand, 4, 'brand-two-product'),
      ...createProducts(thirdBrand, 3, 'brand-three-product'),
      ...createProducts(fourthBrand, 2, 'brand-four-product'),
      ...createProducts(fifthBrand, 1, 'brand-five-product'),
      ...createProducts(hiddenBrand, 10, 'hidden-brand-product'),
      ...createProducts(fifthBrand, 10, 'disabled-fifth-brand-product', false),
    ]);

    const response = await request(app).get('/api/landing/brands/popular');

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data).toHaveLength(5);
    expect(response.body.data.map(({ id }) => String(id))).toEqual([
      String(baseBrand._id),
      String(secondBrand._id),
      String(thirdBrand._id),
      String(fourthBrand._id),
      String(fifthBrand._id),
    ]);
    expect(response.body.data.map(({ productCount }) => productCount)).toEqual([
      5, 4, 3, 2, 1,
    ]);
    expect(response.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: String(hiddenBrand._id) }),
      ]),
    );
  });

  test('returns only recently updated, enabled, in-stock pets', async () => {
    const updatedBy = new mongoose.Types.ObjectId();
    const petAttributes = {
      mainImage: 'https://cdn.example.com/recent-pet.webp',
      mainImageThumbnail: 'data:image/webp;base64,AAAA',
      description: 'توضیحات حیوان',
      petType: new mongoose.Types.ObjectId(),
      breed: new mongoose.Types.ObjectId(),
      inEnable: true,
      quantity: 1,
      updatedBy,
    };
    await PetModel.create([
      ...Array.from({ length: 6 }, (_, index) => ({
        ...petAttributes,
        title: `حیوان به‌روز-${index}`,
        slug: `recent-pet-${index}`,
      })),
      {
        ...petAttributes,
        title: 'حیوان ناموجود',
        slug: 'out-of-stock-pet',
        quantity: 0,
      },
      {
        ...petAttributes,
        title: 'حیوان غیرفعال',
        slug: 'disabled-pet',
        inEnable: false,
      },
      {
        ...petAttributes,
        title: 'حیوان بدون به‌روزرسانی',
        slug: 'not-updated-pet',
        updatedBy: undefined,
      },
    ]);

    const response = await request(app).get('/api/landing/pets/recent');

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data).toHaveLength(5);
    expect(response.body.data.map(({ slug }) => slug)).toEqual([
      'recent-pet-5',
      'recent-pet-4',
      'recent-pet-3',
      'recent-pet-2',
      'recent-pet-1',
    ]);
    expect(response.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'out-of-stock-pet' }),
        expect.objectContaining({ slug: 'disabled-pet' }),
        expect.objectContaining({ slug: 'not-updated-pet' }),
      ]),
    );
  });

  test('returns four distinct featured products in priority order', async () => {
    const products = await ProductModel.find().sort({ title: 1, _id: 1 });
    const [purchased, discounted, cheapest, wishlisted] = products;
    const purchaser = await UserModel.findOne({ phoneNumber: '09120000001' });
    await Promise.all([
      ProductModel.updateOne(
        { _id: purchased._id },
        { $set: { salesVolume: 100, discountPercentage: 90, price: 100 } },
      ),
      ProductModel.updateOne(
        { _id: discounted._id },
        { $set: { salesVolume: 90, discountPercentage: 80, price: 1_000 } },
      ),
      ProductModel.updateOne(
        { _id: cheapest._id },
        { $set: { salesVolume: 80, discountPercentage: 70, price: 10 } },
      ),
      ProductModel.updateOne(
        { _id: wishlisted._id },
        { $set: { salesVolume: 70, discountPercentage: 60, price: 200 } },
      ),
      UserModel.create([
        {
          phoneNumber: '09120000004',
          password: 'password123',
          wishlist: [
            { item: wishlisted._id, itemType: USER_ITEM_TYPES.PRODUCT },
          ],
        },
        {
          phoneNumber: '09120000005',
          password: 'password123',
          wishlist: [
            { item: wishlisted._id, itemType: USER_ITEM_TYPES.PRODUCT },
          ],
        },
      ]),
      OrderModel.create({
        user: purchaser._id,
        orderNumber: '123456789',
        trackingCode: '987654321',
        paymentTrackingId: 'featured-products-payment',
        totalPrice: 300,
        items: [
          {
            item: purchased._id,
            itemType: USER_ITEM_TYPES.PRODUCT,
            quantity: 3,
            price: 100,
            discountPercentage: 0,
            title: purchased.title,
            mainImage: purchased.mainImage,
            mainImageThumbnail: purchased.mainImageThumbnail,
          },
        ],
        discountPrice: 0,
        userAddress: {
          sourceId: new mongoose.Types.ObjectId(),
          province: 'تهران',
          city: 'تهران',
          detailAddress: 'نشانی آزمایشی',
          plate: '۱',
          postalCode: '1234567890',
          receiverIsMe: true,
          firstName: 'کاربر',
          lastName: 'آزمایشی',
          nationalCode: '0012345678',
          phoneNumber: purchaser.phoneNumber,
        },
        deliveringDateToShipping: new Date('2026-09-13T00:00:00.000Z'),
        shippingPrice: 0,
        shippingInfo: {},
        paymentType: CART_PAYMENT_TYPES.DIRECT,
      }),
    ]);

    const response = await request(app).get('/api/landing/products/featured');

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data.map(({ tag }) => tag)).toEqual([
      'mostPurchased',
      'mostDiscounted',
      'cheapest',
      'mostWishlisted',
    ]);
    expect(response.body.data.map(({ product }) => String(product.id))).toEqual(
      [
        String(purchased._id),
        String(discounted._id),
        String(cheapest._id),
        String(wishlisted._id),
      ],
    );
    expect(
      new Set(response.body.data.map(({ product }) => String(product.id))).size,
    ).toBe(4);
  });

  test('supplements a sparse recent-pet section with highest-priced available pets', async () => {
    const updatedBy = new mongoose.Types.ObjectId();
    const petAttributes = {
      mainImage: 'https://cdn.example.com/supplement-pet.webp',
      mainImageThumbnail: 'data:image/webp;base64,AAAA',
      description: 'توضیحات حیوان',
      petType: new mongoose.Types.ObjectId(),
      breed: new mongoose.Types.ObjectId(),
      inEnable: true,
      quantity: 1,
    };
    await PetModel.create([
      {
        ...petAttributes,
        title: 'حیوان تازه',
        slug: 'recently-updated-pet',
        updatedBy,
        price: 100,
      },
      ...[900, 800, 700, 600].map((price) => ({
        ...petAttributes,
        title: `حیوان ارزشمند-${price}`,
        slug: `valuable-pet-${price}`,
        price,
      })),
    ]);

    const response = await request(app).get('/api/landing/pets/recent');

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data.map(({ slug }) => slug)).toEqual([
      'recently-updated-pet',
      'valuable-pet-900',
      'valuable-pet-800',
      'valuable-pet-700',
      'valuable-pet-600',
    ]);
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
