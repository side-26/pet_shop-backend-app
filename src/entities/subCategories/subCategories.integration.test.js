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
    });

    secondPetType = await PetTypeModel.create({
      title: 'Cat',
      description: 'Affectionate pets',
      isEnabled: true,
    });

    /*
     * Use collection.insertOne for fixtures.
     *
     * This avoids unrelated Category model middleware
     * affecting SubCategory integration setup.
     */

    const insertedCategory = await CategoryModel.collection.insertOne({
      title: 'Food',
      petType: testPetType._id,
      enable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    testCategory = await CategoryModel.findById(insertedCategory.insertedId);

    const insertedSecondCategory = await CategoryModel.collection.insertOne({
      title: 'Accessories',
      petType: secondPetType._id,
      enable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    secondCategory = await CategoryModel.findById(
      insertedSecondCategory.insertedId,
    );

    /*
     * Same idea for the default SubCategory fixture:
     * bypass save middleware because POST tests themselves
     * exercise the complete create flow.
     */

    const insertedSubCategory = await SubCategoryModel.collection.insertOne({
      title: 'Dry Food',
      categoryID: testCategory._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    testSubCategory = await SubCategoryModel.findById(
      insertedSubCategory.insertedId,
    );
  });

  // =========================================================
  // POST /api/sub-categories
  // =========================================================

  describe('POST /api/sub-categories', () => {
    it('should create a new sub category', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Wet Food',
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toMatchObject({
        title: 'Wet Food',
      });

      expect(res.body.data.categoryID.toString()).toBe(
        testCategory._id.toString(),
      );

      const createdSubCategory = await SubCategoryModel.findOne({
        title: 'Wet Food',
      });

      expect(createdSubCategory).not.toBeNull();

      expect(createdSubCategory.categoryID.toString()).toBe(
        testCategory._id.toString(),
      );
    });

    it('should return 422 if title is missing', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 422 if categoryID is missing', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Wet Food',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 422 if categoryID format is invalid', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Wet Food',
          categoryID: 'invalid-id',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 422 if category does not exist', async () => {
      const nonExistentCategory = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Wet Food',
          categoryID: nonExistentCategory.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('دسته‌بندی انتخاب شده معتبر نیست');
    });

    it('should return 422 if title already exists in same category', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Dry Food',
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('قبلاً ثبت شده است');
    });

    it('should detect duplicate title case-insensitively', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'dry food',
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should allow same title in another category', async () => {
      const res = await request(app)
        .post('/api/sub-categories')
        .send({
          title: 'Dry Food',
          categoryID: secondCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);

      expect(res.body.data.title).toBe('Dry Food');

      expect(res.body.data.categoryID.toString()).toBe(
        secondCategory._id.toString(),
      );
    });
  });

  // =========================================================
  // GET /api/sub-categories
  // =========================================================

  describe('GET /api/sub-categories', () => {
    it('should get all sub categories', async () => {
      await SubCategoryModel.collection.insertOne({
        title: 'Wet Food',
        categoryID: testCategory._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/sub-categories')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toHaveLength(2);

      expect(res.body.totalRecords).toBe(2);
    });

    it('should filter sub categories by categoryID', async () => {
      await SubCategoryModel.collection.insertOne({
        title: 'Collar',
        categoryID: secondCategory._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/sub-categories')
        .query({
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(1);

      expect(res.body.data[0]).toMatchObject({
        title: 'Dry Food',
      });

      expect(res.body.data[0].categoryID.toString()).toBe(
        testCategory._id.toString(),
      );
    });

    it('should return empty list if category has no sub categories', async () => {
      const emptyCategoryId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get('/api/sub-categories')
        .query({
          categoryID: emptyCategoryId.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toEqual([]);

      expect(res.body.totalRecords).toBe(0);
    });

    it('should return 422 for invalid categoryID query', async () => {
      const res = await request(app)
        .get('/api/sub-categories')
        .query({
          categoryID: 'invalid-id',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // GET /api/sub-categories/:id
  // =========================================================

  describe('GET /api/sub-categories/:id', () => {
    it('should get sub category by ID', async () => {
      const res = await request(app)
        .get(`/api/sub-categories/${testSubCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toMatchObject({
        title: 'Dry Food',
      });

      expect(res.body.data.id.toString()).toBe(testSubCategory._id.toString());

      expect(res.body.data.categoryID.toString()).toBe(
        testCategory._id.toString(),
      );
    });

    it('should return 404 if sub category does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/sub-categories/${nonExistentId}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);

      expect(res.body).toMatchObject({
        isSuccess: false,
        message: 'زیر دسته‌بندی یافت نشد',
      });
    });

    it('should return 422 for invalid sub category ID', async () => {
      const res = await request(app)
        .get('/api/sub-categories/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // PUT /api/sub-categories/:id
  // =========================================================

  describe('PUT /api/sub-categories/:id', () => {
    it('should update sub category', async () => {
      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Premium Dry Food',
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data.title).toBe('Premium Dry Food');

      const updatedSubCategory = await SubCategoryModel.findById(
        testSubCategory._id,
      );

      expect(updatedSubCategory.title).toBe('Premium Dry Food');
    });

    it('should update categoryID', async () => {
      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Moved Food',
          categoryID: secondCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data.title).toBe('Moved Food');

      expect(res.body.data.categoryID.toString()).toBe(
        secondCategory._id.toString(),
      );

      const updatedSubCategory = await SubCategoryModel.findById(
        testSubCategory._id,
      );

      expect(updatedSubCategory.categoryID.toString()).toBe(
        secondCategory._id.toString(),
      );
    });

    it('should return 422 if title is missing on update', async () => {
      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 422 if categoryID is missing on update', async () => {
      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Updated',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 404 if sub category does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/sub-categories/${nonExistentId}`)
        .send({
          title: 'Updated',
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    it('should return 422 if category does not exist', async () => {
      const nonExistentCategory = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Updated',
          categoryID: nonExistentCategory.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('دسته‌بندی انتخاب شده معتبر نیست');
    });

    it('should return 422 if duplicate title exists in same category', async () => {
      await SubCategoryModel.collection.insertOne({
        title: 'Wet Food',
        categoryID: testCategory._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Wet Food',
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('قبلاً ثبت شده است');
    });

    it('should allow same current title and categoryID', async () => {
      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Dry Food',
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);
    });

    it('should allow same title when moving to another category', async () => {
      await SubCategoryModel.collection.insertOne({
        title: 'Other',
        categoryID: secondCategory._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .put(`/api/sub-categories/${testSubCategory._id}`)
        .send({
          title: 'Dry Food',
          categoryID: secondCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);
    });

    it('should return 422 for invalid sub category id', async () => {
      const res = await request(app)
        .put('/api/sub-categories/invalid-id')
        .send({
          title: 'Updated',
          categoryID: testCategory._id.toString(),
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // DELETE /api/sub-categories/:id
  // =========================================================

  describe('DELETE /api/sub-categories/:id', () => {
    it('should permanently delete sub category', async () => {
      const res = await request(app)
        .delete(`/api/sub-categories/${testSubCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      const deletedSubCategory = await SubCategoryModel.findById(
        testSubCategory._id,
      );

      expect(deletedSubCategory).toBeNull();
    });

    it('should return deleted sub category id', async () => {
      const res = await request(app)
        .delete(`/api/sub-categories/${testSubCategory._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data.id.toString()).toBe(testSubCategory._id.toString());
    });

    it('should return 404 if sub category does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/sub-categories/${nonExistentId}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);

      expect(res.body.message).toBe('زیر دسته‌بندی یافت نشد');
    });

    it('should return 422 for invalid sub category id', async () => {
      const res = await request(app)
        .delete('/api/sub-categories/invalid-id')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });
});
