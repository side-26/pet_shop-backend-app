jest.mock('#utils/index.js', () => ({
  setSuccessResponse: jest.fn((res, statusCode, option) => {
    res.status(statusCode).json({
      isSuccess: true,
      ...option,
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

    Object.assign(error, {
      ...options,
    });

    throw error;
  }),
}));

jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    void res;

    req.user = {
      id: '65a4de97aff1fbb38c437952',
      role: 'admin',
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

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

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

  beforeAll(() => {
    app = express();

    app.use(express.json());

    app.use('/api', categoryRoutes);

    app.use(errorHandler);
  });

  beforeEach(async () => {
    await CategoryModel.deleteMany({});
    await PetTypeModel.deleteMany({});

    testPetType = await PetTypeModel.create({
      title: 'Dog',
      description: 'Loyal pets',
      isEnabled: true,
    });

    secondPetType = await PetTypeModel.create({
      title: 'Cat',
      description: 'Affectionate pets',
      isEnabled: true,
    });

    /*
     * Using collection.insertOne here intentionally bypasses
     * Category save middleware while preparing test fixtures.
     *
     * API create tests still exercise the complete model
     * validation/save flow.
     */
    const insertedCategory = await CategoryModel.collection.insertOne({
      title: 'Food',
      petType: testPetType._id,
      enable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    testCategory = await CategoryModel.findById(insertedCategory.insertedId);
  });

  // =========================================================
  // POST /api/categories
  // =========================================================

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          title: 'Toys',
          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toMatchObject({
        title: 'Toys',
        enable: true,
      });

      expect(res.body.data.petType.toString()).toBe(testPetType._id.toString());

      const createdCategory = await CategoryModel.findOne({
        title: 'Toys',
      });

      expect(createdCategory).not.toBeNull();
      expect(createdCategory.enable).toBe(true);
    });

    it('should create category with enable=false', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          title: 'Medicine',
          petType: testPetType._id.toString(),
          enable: false,
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);

      expect(res.body.data).toMatchObject({
        title: 'Medicine',
        enable: false,
      });
    });

    it('should return 422 if title is missing', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 422 if petType is missing', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          title: 'Toys',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 422 if petType format is invalid', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          title: 'Toys',
          petType: 'invalid-id',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 422 if petType does not exist', async () => {
      const nonExistentPetType = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/categories')
        .send({
          title: 'Toys',
          petType: nonExistentPetType.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('نوع حیوان انتخاب شده معتبر نیست');
    });

    it('should return 422 if title already exists for same petType', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          title: 'Food',
          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('قبلاً ثبت شده است');
    });

    it('should detect duplicate title case-insensitively', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          title: 'food',
          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should allow same title for another petType', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          title: 'Food',
          petType: secondPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);
    });
  });

  // =========================================================
  // GET /api/categories
  // =========================================================

  describe('GET /api/categories', () => {
    it('should get all enabled categories', async () => {
      await CategoryModel.collection.insertOne({
        title: 'Toys',
        petType: testPetType._id,
        enable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toHaveLength(2);
      expect(res.body.totalRecords).toBe(2);
    });

    it('should include disabled when includeDisabled=true', async () => {
      await CategoryModel.collection.insertOne({
        title: 'Medicine',
        petType: testPetType._id,
        enable: false,
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
      expect(res.body.totalRecords).toBe(2);
    });

    it('should return only enabled by default', async () => {
      await CategoryModel.collection.insertOne({
        title: 'Medicine',
        petType: testPetType._id,
        enable: false,
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
        enable: true,
      });
    });

    it('should filter categories by petType', async () => {
      await CategoryModel.collection.insertOne({
        title: 'Cat Food',
        petType: secondPetType._id,
        enable: true,
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

      expect(res.body.data[0]).toMatchObject({
        title: 'Food',
      });

      expect(res.body.data[0].petType.toString()).toBe(
        testPetType._id.toString(),
      );
    });

    it('should return 422 for invalid petType query', async () => {
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
  // GET /api/categories/:id
  // =========================================================

  describe('GET /api/categories/:id', () => {
    it('should get category by ID', async () => {
      const res = await request(app)
        .get(`/api/categories/${testCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toMatchObject({
        title: 'Food',
        enable: true,
      });

      expect(res.body.data.id.toString()).toBe(testCategory._id.toString());

      expect(res.body.data.petType.toString()).toBe(testPetType._id.toString());
    });

    it('should return 404 if category not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/categories/${nonExistentId}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);

      expect(res.body).toMatchObject({
        isSuccess: false,
        message: 'دسته‌بندی یافت نشد',
      });
    });

    it('should return 422 for invalid category id', async () => {
      const res = await request(app)
        .get('/api/categories/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // PUT /api/categories/:id
  // =========================================================

  describe('PUT /api/categories/:id', () => {
    it('should update category', async () => {
      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          title: 'Premium Food',
          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data.title).toBe('Premium Food');

      const updatedCategory = await CategoryModel.findById(testCategory._id);

      expect(updatedCategory.title).toBe('Premium Food');
    });

    it('should update title and petType together', async () => {
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

    it('should return 422 if title is missing on update', async () => {
      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 422 if petType is missing on update', async () => {
      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          title: 'Updated Food',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 404 if category not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/categories/${nonExistentId}`)
        .send({
          title: 'Updated Food',
          petType: testPetType._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    it('should return 422 if petType does not exist', async () => {
      const nonExistentPetType = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send({
          title: 'Updated Food',
          petType: nonExistentPetType.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('نوع حیوان انتخاب شده معتبر نیست');
    });

    it('should return 422 if title already exists for petType', async () => {
      await CategoryModel.collection.insertOne({
        title: 'Toys',
        petType: testPetType._id,
        enable: true,
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

      expect(res.body.message).toContain('قبلاً ثبت شده است');
    });

    it('should allow keeping same title and petType on update', async () => {
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
  // PUT /api/categories/:id/disable
  // =========================================================

  describe('PUT /api/categories/disable/:id', () => {
    it('should disable category', async () => {
      const res = await request(app)
        .put(`/api/categories/disable/${testCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data.enable).toBe(false);

      const updatedCategory = await CategoryModel.findById(testCategory._id);

      expect(updatedCategory.enable).toBe(false);
    });

    it('should return 404 if category not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/categories/disable/${nonExistentId}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    it('should return 422 for invalid id', async () => {
      const res = await request(app)
        .put('/api/categories/disable/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // PUT /api/categories/enable/:id
  // =========================================================

  describe('PUT /api/categories/enable/:id', () => {
    it('should enable category', async () => {
      await CategoryModel.collection.updateOne(
        {
          _id: testCategory._id,
        },
        {
          $set: {
            enable: false,
          },
        },
      );

      const res = await request(app)
        .put(`/api/categories/enable/${testCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data.enable).toBe(true);

      const updatedCategory = await CategoryModel.findById(testCategory._id);

      expect(updatedCategory.enable).toBe(true);
    });

    it('should return 404 if category not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/categories/enable/${nonExistentId}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    it('should return 422 for invalid id', async () => {
      const res = await request(app)
        .put('/api/categories/enable/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // DELETE /api/categories/:id
  // =========================================================

  describe('DELETE /api/categories/:id', () => {
    it('should permanently delete category', async () => {
      const res = await request(app)
        .delete(`/api/categories/${testCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      const deletedCategory = await CategoryModel.findById(testCategory._id);

      expect(deletedCategory).toBeNull();
    });

    it('should return 404 if category not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/categories/${nonExistentId}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    it('should return 422 for invalid category id', async () => {
      const res = await request(app)
        .delete('/api/categories/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });
});
