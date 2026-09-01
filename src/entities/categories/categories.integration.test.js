// src/entities/categories/categories.integration.test.js

jest.mock('#utils/helpers.js', () => ({
  setSuccessResponse: jest.fn((res, statusCode, options = {}) => {
    res.status(statusCode).json({
      isSuccess: true,
      ...options,
    });
  }),

  returnFormValidation: jest.fn((schema, body) => {
    const result = schema.safeParse(body);

    if (!result.success) {
      const error = new Error('اطلاعات وارد شده معتبر نیست');

      error.statusCode = 422;

      error.data = {
        messages: result.error?.issues || result.error?.errors || [],

        detail: {},
      };

      throw error;
    }

    return result.data;
  }),

  onCatchPromiseController: jest.fn((err, next) => {
    next(err);
  }),

  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message || 'خطای سمت سرور');

    error.statusCode = statusCode;

    Object.assign(error, options);

    throw error;
  }),
}));

jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    void res;

    req.user = {
      id: '65a4de97aff1fbb38c437952',

      role: jest.requireActual('#configs/constants.js').ROLES.ADMIN,
    };

    next();
  },
}));

jest.mock('#middlewares/role.middleware.js', () => ({
  roleMiddleware: () => (req, res, next) => {
    void req;
    void res;

    next();
  },
}));

jest.mock('#configs/logger.js', () => ({
  app: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },

  api: {
    request: jest.fn(),
  },
}));

jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    createObjectKey: jest.fn(() => 'categories/main/generated.webp'),
    uploadObject: jest.fn(async ({ key }) => key),
    buildPublicUrl: jest.fn((key) => `https://cdn.example.com/${key}`),
    deleteObject: jest.fn(async () => undefined),
    getObjectKeyFromUrl: jest.fn(() => 'categories/main/previous.webp'),
  },
}));

import express from 'express';
import mongoose from 'mongoose';
import sharp from 'sharp';
import request from 'supertest';

import { STATUES } from '#configs/constants.js';

import { errorHandler } from '#middlewares/error.middleware.js';

import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

import { CategoryModel } from './categories.model.js';

import categoryRoutes from './categories.route.js';

describe('Category API - Integration Tests', () => {
  let app;

  let testPetType;
  let secondPetType;

  let testCategory;
  let imageBuffer;

  beforeAll(async () => {
    app = express();

    app.use(express.json());

    app.use('/api', categoryRoutes);

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

  const multipartCategory = (requestBuilder, values) => {
    let form = requestBuilder;
    for (const [field, value] of Object.entries(values)) {
      form = form.field(field, String(value));
    }
    return form.attach('mainImage', imageBuffer, {
      filename: 'category.png',
      contentType: 'image/png',
    });
  };

  beforeEach(async () => {
    await CategoryModel.deleteMany({});

    await PetTypeModel.deleteMany({});

    testPetType = await PetTypeModel.create({
      title: 'Dog',

      description: 'Loyal pets',

      isEnabled: true,
      mainImage: 'https://cdn.example.com/pet-types/dog.webp',
      thumbnail: 'data:image/webp;base64,AAAA',
    });

    secondPetType = await PetTypeModel.create({
      title: 'Cat',

      description: 'Affectionate pets',
      mainImage: 'https://cdn.example.com/pet-types/cat.webp',
      thumbnail: 'data:image/webp;base64,AAAA',

      isEnabled: true,
    });

    const insertedCategory = await CategoryModel.collection.insertOne({
      title: 'Food',

      petType: testPetType._id,

      mainImage: 'https://cdn.example.com/categories/main/food.webp',
      mainThumbnailImage: 'data:image/webp;base64,AAAA',
      slug: 'food',
      isEnable: true,

      createdAt: new Date(),

      updatedAt: new Date(),
    });

    testCategory = await CategoryModel.findById(insertedCategory.insertedId);
  });

  // =========================================================
  // POST
  // =========================================================

  describe('POST /api/categories', () => {
    test('should create a new category', async () => {
      const res = await multipartCategory(
        request(app).post('/api/categories'),
        {
          title: 'Toys',
          petType: testPetType._id.toString(),
        },
      ).set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toMatchObject({
        title: 'Toys',

        isEnable: true,
      });

      expect(res.body.data.petType.toString()).toBe(testPetType._id.toString());

      const created = await CategoryModel.findOne({
        title: 'Toys',
      });

      expect(created).not.toBeNull();

      expect(created.isEnable).toBe(true);
    });

    test('should create category with isEnable=false', async () => {
      const res = await multipartCategory(
        request(app).post('/api/categories'),
        {
          title: 'Medicine',
          petType: testPetType._id.toString(),
          isEnable: false,
        },
      ).set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);

      expect(res.body.data).toMatchObject({
        title: 'Medicine',

        isEnable: false,
      });
    });

    test('should return 422 if title is missing', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 if petType is missing', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          title: 'Toys',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 if petType format is invalid', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          title: 'Toys',

          petType: 'invalid-id',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 if petType does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await multipartCategory(
        request(app).post('/api/categories'),
        {
          title: 'Toys',
          petType: id.toString(),
        },
      ).set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('نوع حیوان انتخاب شده معتبر نیست');
    });

    test('should return 422 if title already exists for same petType', async () => {
      const res = await multipartCategory(
        request(app).post('/api/categories'),
        {
          title: 'Food',
          petType: testPetType._id.toString(),
        },
      ).set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('قبلاً ثبت شده است');
    });

    test('should detect duplicate title case-insensitively', async () => {
      const res = await multipartCategory(
        request(app).post('/api/categories'),
        {
          title: 'food',
          petType: testPetType._id.toString(),
        },
      ).set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should allow same title for another petType', async () => {
      const res = await multipartCategory(
        request(app).post('/api/categories'),
        {
          title: 'Food',
          petType: secondPetType._id.toString(),
        },
      ).set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);
      expect(res.body.data.slug).not.toBe(testCategory.slug);
    });
  });

  // =========================================================
  // GET ALL
  // =========================================================

  describe('GET /api/categories', () => {
    test('should get all enabled categories', async () => {
      await CategoryModel.collection.insertOne({
        title: 'Toys',

        petType: testPetType._id,

        mainImage: 'https://cdn.example.com/categories/main/toys.webp',
        mainThumbnailImage: 'data:image/webp;base64,AAAA',
        slug: 'toys',
        isEnable: true,

        createdAt: new Date(),

        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(2);

      expect(res.body.totalRecords).toBe(2);
    });

    test('should include disabled when includeDisabled=true', async () => {
      await CategoryModel.collection.insertOne({
        title: 'Medicine',

        petType: testPetType._id,

        mainImage: 'https://cdn.example.com/categories/main/medicine.webp',
        mainThumbnailImage: 'data:image/webp;base64,AAAA',
        slug: 'medicine',
        isEnable: false,

        createdAt: new Date(),

        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/categories')
        .query({
          includeDisabled: 'true',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(2);
    });

    test('should return only enabled by default', async () => {
      await CategoryModel.collection.insertOne({
        title: 'Medicine',

        petType: testPetType._id,

        mainImage: 'https://cdn.example.com/categories/main/medicine.webp',
        mainThumbnailImage: 'data:image/webp;base64,AAAA',
        slug: 'medicine',
        isEnable: false,

        createdAt: new Date(),

        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(1);

      expect(res.body.data[0]).toMatchObject({
        title: 'Food',

        isEnable: true,
      });
    });

    test('should filter categories by petType', async () => {
      await CategoryModel.collection.insertOne({
        title: 'Cat Food',

        petType: secondPetType._id,

        mainImage: 'https://cdn.example.com/categories/main/cat-food.webp',
        mainThumbnailImage: 'data:image/webp;base64,AAAA',
        slug: 'cat-food',
        isEnable: true,

        createdAt: new Date(),

        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/categories')
        .query({
          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(1);

      expect(res.body.data[0].title).toBe('Food');
    });

    test('should return 422 for invalid petType query', async () => {
      const res = await request(app)
        .get('/api/categories')
        .query({
          petType: 'invalid-id',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // GET BY ID
  // =========================================================

  describe('GET /api/categories/:id', () => {
    test('should get category by ID', async () => {
      const res = await request(app)
        .get(`/api/categories/${testCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toMatchObject({
        title: 'Food',

        isEnable: true,
      });

      expect(res.body.data.id.toString()).toBe(testCategory._id.toString());
    });

    test('should return 404 if category does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/categories/${id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);

      expect(res.body.message).toBe('دسته‌بندی یافت نشد');
    });

    test('should return 422 for invalid category id', async () => {
      const res = await request(app)
        .get('/api/categories/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // UPDATE
  // =========================================================

  describe('PUT /api/categories/:id', () => {
    test('should update category without requiring a replacement image', async () => {
      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          title: 'Premium Food',

          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data.title).toBe('Premium Food');

      const updated = await CategoryModel.findById(testCategory._id);

      expect(updated.title).toBe('Premium Food');
    });

    test('should update title and petType together', async () => {
      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          title: 'Cat Food',

          petType: secondPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data.title).toBe('Cat Food');

      expect(res.body.data.petType.toString()).toBe(
        secondPetType._id.toString(),
      );
    });

    test('should return 422 if title is missing', async () => {
      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 if petType is missing', async () => {
      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          title: 'Updated',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 404 if category does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/categories/${id}`)
        .send({
          title: 'Updated',

          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    test('should return 422 if petType does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          title: 'Updated',

          petType: id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 if duplicate exists', async () => {
      await CategoryModel.collection.insertOne({
        title: 'Toys',

        petType: testPetType._id,

        mainImage: 'https://cdn.example.com/categories/main/toys.webp',
        mainThumbnailImage: 'data:image/webp;base64,AAAA',
        slug: 'toys',
        isEnable: true,

        createdAt: new Date(),

        updatedAt: new Date(),
      });

      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          title: 'Toys',

          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should allow keeping same title and petType', async () => {
      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          title: 'Food',

          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);
    });
  });

  // =========================================================
  // DISABLE
  // =========================================================

  describe('PUT /api/categories/disable/:id', () => {
    test('should disable category', async () => {
      const res = await request(app)
        .put(`/api/categories/disable/${testCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data.isEnable).toBe(false);

      const updated = await CategoryModel.findById(testCategory._id);

      expect(updated.isEnable).toBe(false);
    });

    test('should return 404 if category does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/categories/disable/${id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    test('should return 422 for invalid id', async () => {
      const res = await request(app)
        .put('/api/categories/disable/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // ENABLE
  // =========================================================

  describe('PUT /api/categories/enable/:id', () => {
    test('should enable category', async () => {
      await CategoryModel.collection.updateOne(
        {
          _id: testCategory._id,
        },

        {
          $set: {
            isEnable: false,
          },
        },
      );

      const res = await request(app)
        .put(`/api/categories/enable/${testCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data.isEnable).toBe(true);

      const updated = await CategoryModel.findById(testCategory._id);

      expect(updated.isEnable).toBe(true);
    });

    test('should return 404 if category does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/categories/enable/${id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    test('should return 422 for invalid id', async () => {
      const res = await request(app)
        .put('/api/categories/enable/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // DELETE
  // =========================================================

  describe('DELETE /api/categories/:id', () => {
    test('should permanently delete category', async () => {
      const res = await request(app)
        .delete(`/api/categories/${testCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      const deleted = await CategoryModel.findById(testCategory._id);

      expect(deleted).toBeNull();
    });

    test('should return 404 if category does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/categories/${id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    test('should return 422 for invalid category id', async () => {
      const res = await request(app)
        .delete('/api/categories/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });
});
