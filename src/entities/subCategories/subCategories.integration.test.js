// src/entities/subCategories/subCategories.integration.test.js

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
        messages: result.error?.issues || [],

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

import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';

import { STATUES } from '#configs/constants.js';

import { errorHandler } from '#middlewares/error.middleware.js';

import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

import { CategoryModel } from '#entities/categories/categories.model.js';

import { SubCategoryModel } from './subCategories.model.js';

import subCategoryRoutes from './subCategories.route.js';

describe('SubCategory API - Integration Tests', () => {
  let app;

  let testPetType;
  let secondPetType;

  let testCategory;
  let secondCategory;

  let testSubCategory;

  beforeAll(() => {
    app = express();

    app.use(express.json());

    app.use('/api', subCategoryRoutes);

    app.use(errorHandler);
  });

  beforeEach(async () => {
    await SubCategoryModel.deleteMany({});

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

    const categoryResult = await CategoryModel.collection.insertOne({
      title: 'Food',

      petType: testPetType._id,

      enable: true,

      createdAt: new Date(),

      updatedAt: new Date(),
    });

    testCategory = await CategoryModel.findById(categoryResult.insertedId);

    const secondCategoryResult = await CategoryModel.collection.insertOne({
      title: 'Accessories',

      petType: secondPetType._id,

      enable: true,

      createdAt: new Date(),

      updatedAt: new Date(),
    });

    secondCategory = await CategoryModel.findById(
      secondCategoryResult.insertedId,
    );

    const result = await SubCategoryModel.collection.insertOne({
      title: 'Dry Food',

      category: testCategory._id,

      createdAt: new Date(),

      updatedAt: new Date(),
    });

    testSubCategory = await SubCategoryModel.findById(result.insertedId);
  });

  // ============================================
  // CREATE
  // ============================================

  describe('POST /api/sub-categories', () => {
    test('should create sub category', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Wet Food',

          category: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);

      expect(res.body.isSuccess).toBe(true);

      expect(res.body.data.title).toBe('Wet Food');

      expect(res.body.data.category.toString()).toBe(
        testCategory._id.toString(),
      );

      const created = await SubCategoryModel.findOne({
        title: 'Wet Food',
      });

      expect(created).not.toBeNull();

      expect(created.category.toString()).toBe(testCategory._id.toString());
    });

    test('should return 422 if title missing', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          category: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 if category missing', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Wet Food',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 for invalid category', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Wet Food',

          category: 'invalid-id',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 if category does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Wet Food',

          category: id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('دسته‌بندی انتخاب شده معتبر نیست');
    });

    test('should return 422 for duplicate in same category', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Dry Food',

          category: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should detect duplicate case-insensitively', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'dry food',

          category: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should allow same title in different category', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Dry Food',

          category: secondCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);
    });
  });

  // ============================================
  // FIND ALL
  // ============================================

  describe('GET /api/sub-categories', () => {
    test('should return all sub categories', async () => {
      await SubCategoryModel.collection.insertOne({
        title: 'Wet Food',

        category: testCategory._id,

        createdAt: new Date(),

        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/sub-categories')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(2);

      expect(res.body.totalRecords).toBe(2);
    });

    test('should filter by category', async () => {
      await SubCategoryModel.collection.insertOne({
        title: 'Collar',

        category: secondCategory._id,

        createdAt: new Date(),

        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/sub-categories')
        .query({
          category: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(1);

      expect(res.body.data[0].title).toBe('Dry Food');

      expect(res.body.data[0].category.toString()).toBe(
        testCategory._id.toString(),
      );
    });

    test('should return empty array for category without sub categories', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get('/api/sub-categories')
        .query({
          category: id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toEqual([]);

      expect(res.body.totalRecords).toBe(0);
    });

    test('should return 422 for invalid category query', async () => {
      const res = await request(app)
        .get('/api/sub-categories')
        .query({
          category: 'invalid-id',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // ============================================
  // FIND BY ID
  // ============================================

  describe('GET /api/sub-categories/:id', () => {
    test('should return sub category', async () => {
      const res = await request(app)
        .get(`/api/sub-categories/${testSubCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data.title).toBe('Dry Food');

      expect(res.body.data.id.toString()).toBe(testSubCategory._id.toString());

      expect(res.body.data.category.toString()).toBe(
        testCategory._id.toString(),
      );
    });

    test('should return 404 if not found', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/sub-categories/${id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    test('should return 422 for invalid id', async () => {
      const res = await request(app)
        .get('/api/sub-categories/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // ============================================
  // UPDATE
  // ============================================

  describe('PUT /api/sub-categories/:id', () => {
    test('should update sub category', async () => {
      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Premium Dry Food',

          category: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data.title).toBe('Premium Dry Food');

      const updated = await SubCategoryModel.findById(testSubCategory._id);

      expect(updated.title).toBe('Premium Dry Food');
    });

    test('should update category relation', async () => {
      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Moved Food',

          category: secondCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data.category.toString()).toBe(
        secondCategory._id.toString(),
      );
    });

    test('should return 422 if title missing', async () => {
      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          category: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 if category missing', async () => {
      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Updated',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 404 if sub category not found', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/sub-categories/${id}`)
        .send({
          title: 'Updated',

          category: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    test('should return 422 if category does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Updated',

          category: id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 for duplicate', async () => {
      await SubCategoryModel.collection.insertOne({
        title: 'Wet Food',

        category: testCategory._id,

        createdAt: new Date(),

        updatedAt: new Date(),
      });

      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Wet Food',

          category: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should allow same existing title and category', async () => {
      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Dry Food',

          category: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);
    });
  });

  // ============================================
  // DELETE
  // ============================================

  describe('DELETE /api/sub-categories/:id', () => {
    test('should delete sub category', async () => {
      const res = await request(app)
        .delete(`/api/sub-categories/${testSubCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      const deleted = await SubCategoryModel.findById(testSubCategory._id);

      expect(deleted).toBeNull();
    });

    test('should return deleted id', async () => {
      const res = await request(app)
        .delete(`/api/sub-categories/${testSubCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.body.data.id.toString()).toBe(testSubCategory._id.toString());
    });

    test('should return 404 if not found', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/sub-categories/${id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    test('should return 422 for invalid id', async () => {
      const res = await request(app)
        .delete('/api/sub-categories/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });
});
