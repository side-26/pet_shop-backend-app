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
    createObjectKey: jest.fn(() => 'products/main/generated.webp'),
    uploadObject: jest.fn(async ({ key }) => key),
    buildPublicUrl: jest.fn((key) => `https://cdn.example.com/${key}`),
    deleteObject: jest.fn(async () => undefined),
    getObjectKeyFromUrl: jest.fn(() => 'products/main/previous.webp'),
  },
}));

import express from 'express';
import sharp from 'sharp';
import request from 'supertest';

import { ROLES, STATUES } from '#configs/constants.js';
import { CategoryModel } from '#entities/categories/categories.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import { ProductModel } from './products.model.js';
import productRoutes from './products.route.js';

const baseProductData = {
  title: 'Premium cat food',
  mainImage: 'https://cdn.example.com/products/main.webp',
  images: ['https://cdn.example.com/products/one.webp'],
  mainImageThumbnail: 'data:image/webp;base64,AAAA',
  summary: 'Healthy daily food',
  description: 'Complete dry food for adult cats.',
  quantity: 12,
  price: 250000,
  discountPercentage: 10,
  isEnable: true,
  slug: 'premium-cat-food',
};
const categoryImageFields = {
  mainImage: 'https://cdn.example.com/categories/main.webp',
  mainThumbnailImage: 'data:image/webp;base64,AAAA',
};

describe('Product API', () => {
  let app;
  let category;
  let otherCategory;
  let subCategory;
  let otherSubCategory;
  let productData;
  let imageBuffer;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', productRoutes);
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

  const multipartProduct = (requestBuilder, values, galleryImages = []) => {
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
      filename: 'product.png',
      contentType: 'image/png',
    });
    for (const [index, galleryImage] of galleryImages.entries()) {
      form = form.attach('images', galleryImage, {
        filename: `product-gallery-${index}.png`,
        contentType: 'image/png',
      });
    }
    return form;
  };

  beforeEach(async () => {
    await Promise.all([
      ProductModel.deleteMany({}),
      SubCategoryModel.deleteMany({}),
      CategoryModel.deleteMany({}),
      PetTypeModel.deleteMany({}),
    ]);
    const petType = await PetTypeModel.create({
      title: 'Cat',
      mainImage: 'https://cdn.example.com/pet-types/cat.webp',
      thumbnail: 'data:image/webp;base64,AAAA',
    });
    [category, otherCategory] = await CategoryModel.create([
      {
        ...categoryImageFields,
        title: 'Food',
        petType: petType._id,
        isEnable: true,
      },
      {
        ...categoryImageFields,
        title: 'Accessories',
        petType: petType._id,
        isEnable: true,
      },
    ]);
    [subCategory, otherSubCategory] = await SubCategoryModel.create([
      { title: 'Dry Food', category: category._id },
      { title: 'Collars', category: otherCategory._id },
    ]);
    productData = {
      ...baseProductData,
      category: category._id.toString(),
      subCategory: subCategory._id.toString(),
    };
  });

  test('creates products with generated status, slug, and price defaults', async () => {
    const withSubCategory = await multipartProduct(
      request(app).post('/api/products'),
      {
        ...productData,
      },
      [imageBuffer],
    );
    expect(withSubCategory.status).toBe(STATUES.CREATED);
    expect(withSubCategory.body.data).toMatchObject({
      quantity: productData.quantity,
      price: 0,
      discountPercentage: 0,
      isEnable: true,
    });
    expect(withSubCategory.body.data.slug).toMatch(
      /^premium-cat-food-[0-9a-f]{8}$/,
    );
    expect(withSubCategory.body.data.images).toEqual([
      'https://cdn.example.com/products/main/generated.webp',
    ]);

    const withoutSubCategory = await multipartProduct(
      request(app).post('/api/products'),
      {
        ...productData,
        title: 'Simple cat food',
        subCategory: undefined,
      },
    );
    expect(withoutSubCategory.status).toBe(STATUES.CREATED);
    expect(withoutSubCategory.body.data.subCategory).toBeNull();
    expect(withSubCategory.body.data.mainImage).toMatch(
      /^https:\/\/cdn\.example\.com\//,
    );
    expect(withSubCategory.body.data.mainImageThumbnail).toMatch(
      /^data:image\/webp;base64,/,
    );
    expect(
      Buffer.byteLength(withSubCategory.body.data.mainImageThumbnail),
    ).toBeLessThan(10 * 1024);
  });

  test('rejects missing required fields and ignores create-only restricted inputs', async () => {
    const missing = await request(app)
      .post('/api/products')
      .send({ ...productData, title: undefined });
    expect(missing.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const response = await multipartProduct(
      request(app).post('/api/products'),
      {
        ...productData,
        price: 100,
        discountPercentage: 101,
        isEnable: false,
        slug: 'client-supplied-slug',
        salesVolume: 99,
      },
    );
    expect(response.status).toBe(STATUES.CREATED);
    expect(response.body.data).toMatchObject({
      price: 0,
      discountPercentage: 0,
      isEnable: true,
    });
    expect(response.body.data.slug).not.toBe('client-supplied-slug');
    expect(
      (await ProductModel.findById(response.body.data.id)).salesVolume,
    ).toBe(0);
  });

  test('rejects invalid Category, invalid SubCategory, and mismatched ownership', async () => {
    const missingId = '65a4de97aff1fbb38c437999';
    expect(
      (
        await request(app)
          .post('/api/products')
          .send({ ...productData, category: missingId })
      ).status,
    ).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(
      (
        await request(app)
          .post('/api/products')
          .send({ ...productData, subCategory: missingId })
      ).status,
    ).toBe(STATUES.BAD_FORM_VALIDATION);
    const mismatch = await request(app)
      .post('/api/products')
      .send({ ...productData, subCategory: otherSubCategory._id.toString() });
    expect(mismatch.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(mismatch.body.message).toContain('متعلق');
  });

  test('seller can update product sections, toggle status, read, and paginate', async () => {
    const product = await ProductModel.create({
      ...productData,
      salesVolume: 13,
    });
    const seller = { 'x-test-role': ROLES.SELLER };

    const updated = await request(app)
      .put(`/api/products/${product._id}`)
      .set(seller)
      .send({ title: 'Updated food', salesVolume: 99 });
    expect(updated.status).toBe(STATUES.SUCCESS);
    expect(updated.body.data.title).toBe('Updated food');
    expect(updated.body.data).not.toHaveProperty('salesVolume');
    const mainInfoUpdated = await request(app)
      .put(`/api/products/${product._id}/main-info`)
      .set(seller)
      .send({
        category: category._id.toString(),
        subCategory: subCategory._id.toString(),
        quantity: 9,
        summary: 'Updated summary',
        description: 'Updated product description.',
      });
    expect(mainInfoUpdated.status).toBe(STATUES.SUCCESS);
    expect(mainInfoUpdated.body.data).toMatchObject({
      title: 'Updated food',
      category: { title: 'Food' },
      subCategory: { title: 'Dry Food' },
      quantity: 9,
      summary: 'Updated summary',
      description: 'Updated product description.',
    });
    const mainInfo = await request(app)
      .get(`/api/products/${product._id}/main-info`)
      .set(seller);
    expect(mainInfo.status).toBe(STATUES.SUCCESS);
    expect(mainInfo.body.data).toEqual(mainInfoUpdated.body.data);
    const imageUpdated = await request(app)
      .put(`/api/products/${product._id}/images`)
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
      productData.mainImageThumbnail,
    );
    expect(imageUpdated.body.data.imagesList).toEqual([
      'https://cdn.example.com/products/main/generated.webp',
    ]);
    const priceUpdated = await request(app)
      .put(`/api/products/${product._id}/price`)
      .set(seller)
      .send({ price: 275000, discountPercentage: 15 });
    expect(priceUpdated.body.data).toEqual({
      price: 275000,
      discountPercentage: 15,
    });
    const images = await request(app)
      .get(`/api/products/${product._id}/images`)
      .set(seller);
    expect(images.body.data.imagesList).toEqual([
      'https://cdn.example.com/products/main/generated.webp',
    ]);
    const price = await request(app)
      .get(`/api/products/${product._id}/price`)
      .set(seller);
    expect(price.body.data).toEqual({ price: 275000, discountPercentage: 15 });
    expect(
      (
        await request(app)
          .patch(`/api/products/${product._id}/disable`)
          .set(seller)
      ).body.data.isEnable,
    ).toBe(false);
    expect(
      (
        await request(app)
          .patch(`/api/products/${product._id}/enable`)
          .set(seller)
      ).body.data.isEnable,
    ).toBe(true);
    expect(
      (
        await request(app)
          .get(`/api/products/manage/${product._id}`)
          .set(seller)
      ).status,
    ).toBe(STATUES.SUCCESS);
    const list = await request(app)
      .get(
        `/api/products/paginate?title=updated&category=${category._id}&subCategory=${subCategory._id}&price=275000&quantity=9&isEnable=true`,
      )
      .set(seller);
    expect(list.status).toBe(STATUES.SUCCESS);
    expect(list.body.data.pagination.totalItems).toBe(1);
    expect(list.body.data.result[0].images).toEqual([
      'https://cdn.example.com/products/main/generated.webp',
    ]);
    expect(list.body.data.result[0]).toHaveProperty('salesVolume', 13);
    expect(
      (
        await request(app)
          .get(`/api/products/manage/${product._id}`)
          .set(seller)
      ).body.data,
    ).not.toHaveProperty('salesVolume');
  });

  test('validates effective category/subCategory pair during partial updates', async () => {
    const product = await ProductModel.create(productData);
    const response = await request(app)
      .patch(`/api/products/${product._id}`)
      .send({ category: otherCategory._id.toString() });
    expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(response.body.message).toContain('متعلق');
  });

  test('seller cannot delete while admin can delete', async () => {
    const product = await ProductModel.create(productData);
    const sellerResponse = await request(app)
      .delete(`/api/products/${product._id}`)
      .set('x-test-role', ROLES.SELLER);
    expect(sellerResponse.status).toBe(STATUES.NO_ACCESS);
    expect(await ProductModel.findById(product._id)).not.toBeNull();

    const adminResponse = await request(app).delete(
      `/api/products/${product._id}`,
    );
    expect(adminResponse.status).toBe(STATUES.SUCCESS);
    expect(await ProductModel.findById(product._id)).toBeNull();
  });

  test('customer list hides images and returns relation titles', async () => {
    await ProductModel.create(productData);
    await ProductModel.create({
      ...productData,
      title: 'Hidden food',
      slug: 'hidden-food',
      isEnable: false,
    });
    await ProductModel.create({
      ...productData,
      title: 'General food',
      slug: 'general-food',
      subCategory: undefined,
    });

    const response = await request(app).get('/api/products');
    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        result: expect.any(Array),
        pagination: expect.any(Object),
      }),
    );
    expect(response.body.data.result).toHaveLength(2);
    expect(response.body.data.result[0]).not.toHaveProperty('images');
    expect(response.body.data.result[0].category).toBe('Food');
    expect(
      response.body.data.result.map(({ subCategory: value }) => value),
    ).toContain(null);
  });

  test('customer detail includes images and complete optional relations', async () => {
    const product = await ProductModel.create(productData);
    const response = await request(app).get(
      `/api/products/customer/${product._id}`,
    );
    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data.images).toEqual(baseProductData.images);
    expect(response.body.data.category).toMatchObject({ title: 'Food' });
    expect(response.body.data.subCategory).toMatchObject({ title: 'Dry Food' });

    const withoutSubCategory = await ProductModel.create({
      ...productData,
      title: 'No subcategory',
      slug: 'no-subcategory',
      subCategory: undefined,
    });
    const withoutResponse = await request(app).get(
      `/api/products/customer/${withoutSubCategory._id}`,
    );
    expect(withoutResponse.body.data.subCategory).toBeNull();
  });

  test('customer detail hides disabled products', async () => {
    const product = await ProductModel.create({
      ...productData,
      isEnable: false,
    });
    const response = await request(app).get(
      `/api/products/customer/${product._id}`,
    );
    expect(response.status).toBe(STATUES.NOT_FOUND);
    expect(response.body.message).toBe('محصول یافت نشد');
  });
});
