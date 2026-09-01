// src/entities/petTypes/petTypes.integration.test.js

jest.mock('#utils/helpers.js', () => ({
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

jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    createObjectKey: jest.fn(() => 'pet-types/main/generated.webp'),
    uploadObject: jest.fn(async ({ key }) => key),
    buildPublicUrl: jest.fn((key) => `https://cdn.example.com/${key}`),
    deleteObject: jest.fn(async () => undefined),
    getObjectKeyFromUrl: jest.fn(() => 'pet-types/main/previous.webp'),
  },
}));

jest.mock('./petTypes.cache.store.js', () => {
  const getOrLoad = jest.fn((label, loader) => loader());

  return {
    PetTypeCacheStore: class PetTypeCacheStore {
      static getAllLabel(includeDisabled) {
        return includeDisabled ? 'all:with-disabled' : 'all:enabled';
      }

      static getByIdLabel(id) {
        return `id:${id}`;
      }

      static getBySlugLabel(slug) {
        return `slug:${slug}`;
      }

      getOrLoad = getOrLoad;

      invalidate = jest.fn();
    },
  };
});

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import sharp from 'sharp';

import { PetTypeModel } from './petTypes.model.js';
import petTypeRoutes from './petTypes.route.js';

import { STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';

describe('PetType API - Integration Tests', () => {
  let app;
  let testPetType;
  let imageBuffer;

  beforeAll(async () => {
    app = express();

    app.use(express.json());

    app.use('/api', petTypeRoutes);

    // Use the real application error handler
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

  const attachMainImage = (requestBuilder) =>
    requestBuilder.attach('mainImage', imageBuffer, {
      filename: 'pet-type.png',
      contentType: 'image/png',
    });

  const storedImageFields = {
    mainImage: 'https://cdn.example.com/pet-types/main/fixture.webp',
    thumbnail: 'data:image/webp;base64,AAAA',
  };

  beforeEach(async () => {
    // Clean PetType collection before every test
    await PetTypeModel.deleteMany({});

    testPetType = await PetTypeModel.create({
      title: 'Dog',
      description: 'Loyal pets',
      isEnabled: true,
      mainImage: 'https://cdn.example.com/pet-types/main/dog.webp',
      thumbnail: 'data:image/webp;base64,AAAA',
    });
  });

  // =========================================================
  // POST /api/pet-types
  // =========================================================

  describe('POST /api/pet-types', () => {
    it('should create a new pet type', async () => {
      const res = await attachMainImage(
        request(app)
          .post('/api/pet-types')
          .field('title', 'Cat')
          .field('description', 'Affectionate pets')
          .set('Authorization', 'Bearer token'),
      );

      expect(res.status).toBe(STATUES.CREATED);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toMatchObject({
        title: 'Cat',
        description: 'Affectionate pets',
        isEnabled: true,
        slug: 'cat',
      });

      const createdPetType = await PetTypeModel.findOne({
        title: 'Cat',
      });

      expect(createdPetType).not.toBeNull();
      expect(createdPetType.slug).toBe('cat');
      expect(createdPetType.mainImage).toMatch(
        /^https:\/\/cdn\.example\.com\//,
      );
      expect(Buffer.byteLength(createdPetType.thumbnail)).toBeLessThan(
        10 * 1024,
      );
    });

    it('should create a non-empty Unicode slug for a Persian title', async () => {
      const res = await attachMainImage(
        request(app)
          .post('/api/pet-types')
          .field('title', 'پرنده')
          .set('Authorization', 'Bearer token'),
      );

      expect(res.status).toBe(STATUES.CREATED);
      expect(res.body.data.slug).toBe('پرنده');

      const bySlug = await request(app).get(
        `/api/pet-types/slug/${encodeURIComponent('پرنده')}`,
      );

      expect(bySlug.status).toBe(STATUES.SUCCESS);
      expect(bySlug.body.data.title).toBe('پرنده');
    });

    it('should never create an empty slug for a symbol-only title', async () => {
      const petType = await PetTypeModel.create({
        ...storedImageFields,
        title: '!!',
      });

      expect(petType.slug).toMatch(/^pet-type-[0-9a-f]{8}$/);
    });

    it('should return 422 if title is missing', async () => {
      const res = await request(app)
        .post('/api/pet-types')
        .send({
          description: 'No title',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body).toMatchObject({
        isSuccess: false,
        message: 'اطلاعات وارد شده معتبر نیست',
      });
    });

    it('should require mainImage when creating a pet type', async () => {
      const res = await request(app)
        .post('/api/pet-types')
        .field('title', 'Rabbit')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
      expect(res.body.message).toBe('اطلاعات وارد شده معتبر نیست');
    });

    it('should reject a mainImage that is 1 MB or larger', async () => {
      const res = await request(app)
        .post('/api/pet-types')
        .field('title', 'Rabbit')
        .attach('mainImage', Buffer.alloc(1024 * 1024), {
          filename: 'large.png',
          contentType: 'image/png',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should reject an unsupported mainImage format', async () => {
      const res = await request(app)
        .post('/api/pet-types')
        .field('title', 'Rabbit')
        .attach('mainImage', imageBuffer, {
          filename: 'rabbit.avif',
          contentType: 'image/avif',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    it('should return 422 if title already exists', async () => {
      const res = await attachMainImage(
        request(app)
          .post('/api/pet-types')
          .field('title', 'Dog')
          .set('Authorization', 'Bearer token'),
      );

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body).toMatchObject({
        isSuccess: false,
      });

      expect(res.body.message).toContain('قبلاً ثبت شده است');
    });
  });

  // =========================================================
  // GET /api/pet-types
  // =========================================================

  describe('GET /api/pet-types', () => {
    it('should get all enabled pet types', async () => {
      await PetTypeModel.create({
        ...storedImageFields,
        title: 'Cat',
        isEnabled: true,
      });

      const res = await request(app).get('/api/pet-types');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toHaveLength(2);
      expect(res.body.totalRecords).toBe(2);
    });

    it('should include disabled when includeDisabled=true', async () => {
      await PetTypeModel.create({
        ...storedImageFields,
        title: 'Bird',
        isEnabled: false,
      });

      const res = await request(app).get('/api/pet-types').query({
        includeDisabled: 'true',
      });

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(2);
    });

    it('should return only enabled by default', async () => {
      await PetTypeModel.create({
        ...storedImageFields,
        title: 'Bird',
        isEnabled: false,
      });

      const res = await request(app).get('/api/pet-types');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(1);

      expect(res.body.data[0]).toMatchObject({
        title: 'Dog',
        isEnabled: true,
      });
    });
  });

  // =========================================================
  // GET /api/pet-types/:id
  // =========================================================

  describe('GET /api/pet-types/:id', () => {
    it('should get pet type by ID', async () => {
      const res = await request(app).get(`/api/pet-types/${testPetType._id}`);

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toMatchObject({
        title: 'Dog',
        description: 'Loyal pets',
        isEnabled: true,
        slug: 'dog',
      });

      expect(res.body.data.id.toString()).toBe(testPetType._id.toString());
    });

    it('should return 404 if not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app).get(`/api/pet-types/${nonExistentId}`);

      expect(res.status).toBe(STATUES.NOT_FOUND);

      expect(res.body).toMatchObject({
        isSuccess: false,
        message: 'نوع حیوان یافت نشد',
      });
    });
  });

  // =========================================================
  // GET /api/pet-types/slug/:slug
  // =========================================================

  describe('GET /api/pet-types/slug/:slug', () => {
    it('should get pet type by slug', async () => {
      const res = await request(app).get('/api/pet-types/slug/dog');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data).toMatchObject({
        title: 'Dog',
        slug: 'dog',
        isEnabled: true,
      });
    });

    it('should return 404 if slug not found', async () => {
      const res = await request(app).get('/api/pet-types/slug/non-existent');

      expect(res.status).toBe(STATUES.NOT_FOUND);

      expect(res.body).toMatchObject({
        isSuccess: false,
        message: 'نوع حیوان یافت نشد',
      });
    });
  });

  // =========================================================
  // PUT /api/pet-types/:id
  // =========================================================

  describe('PUT /api/pet-types/:id', () => {
    it('should preserve mainImage when updating without a replacement', async () => {
      const previousMainImage = testPetType.mainImage;
      const res = await request(app)
        .put(`/api/pet-types/${testPetType._id}`)
        .field('title', 'Canine')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(res.body.data.mainImage).toBe(previousMainImage);
    });

    it('should update pet type', async () => {
      const res = await attachMainImage(
        request(app)
          .put(`/api/pet-types/${testPetType._id}`)
          .field('title', 'Canine')
          .set('Authorization', 'Bearer token'),
      );

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data.title).toBe('Canine');

      const updatedPetType = await PetTypeModel.findById(testPetType._id);

      expect(updatedPetType.title).toBe('Canine');
    });

    it('should return 404 if not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await attachMainImage(
        request(app)
          .put(`/api/pet-types/${nonExistentId}`)
          .field('title', 'Test')
          .set('Authorization', 'Bearer token'),
      );

      expect(res.status).toBe(STATUES.NOT_FOUND);

      expect(res.body).toMatchObject({
        isSuccess: false,
        message: 'نوع حیوان یافت نشد',
      });
    });

    it('should return 422 if title already exists', async () => {
      await PetTypeModel.create({
        ...storedImageFields,
        title: 'Cat',
      });

      const res = await attachMainImage(
        request(app)
          .put(`/api/pet-types/${testPetType._id}`)
          .field('title', 'Cat')
          .set('Authorization', 'Bearer token'),
      );

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body).toMatchObject({
        isSuccess: false,
      });

      expect(res.body.message).toContain('قبلاً ثبت شده است');
    });
  });

  // =========================================================
  // PROPERTY DEFINITIONS
  // =========================================================

  describe('PUT /api/pet-types/range', () => {
    it('should replace property definitions with label and value entries', async () => {
      const propertyDefinitions = [
        { label: 'رنگ', value: 'قهوه‌ای' },
        { label: 'وزن', value: 12 },
      ];

      const res = await request(app)
        .put('/api/pet-types/range')
        .send({ id: testPetType._id.toString(), propertyDefinitions })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(res.body.data.propertyDefinitions).toEqual(propertyDefinitions);

      const saved = await PetTypeModel.findById(testPetType._id);
      expect(saved.propertyDefinitions.toObject()).toEqual([
        { label: 'رنگ', value: 'قهوه‌ای', required: false },
        { label: 'وزن', value: 12, required: false },
      ]);
    });
  });

  describe('GET /api/pet-types/property-definitions/:id', () => {
    it('should return property definitions as result entries', async () => {
      testPetType.propertyDefinitions = [
        { label: 'رنگ', value: 'قهوه‌ای' },
        { label: 'وزن', value: 12 },
      ];
      await testPetType.save();

      const res = await request(app).get(
        `/api/pet-types/property-definitions/${testPetType._id}`,
      );

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(res.body.data).toEqual({
        result: [
          { label: 'رنگ', value: 'قهوه‌ای' },
          { label: 'وزن', value: 12 },
        ],
      });
    });
  });

  // =========================================================
  // PATCH /api/pet-types/:id/disable
  // =========================================================

  describe('PATCH /api/pet-types/:id/disable', () => {
    it('should disable (soft delete) pet type', async () => {
      const res = await request(app)
        .patch(`/api/pet-types/${testPetType._id}/disable`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data.isEnabled).toBe(false);

      const updatedPetType = await PetTypeModel.findById(testPetType._id);

      expect(updatedPetType).not.toBeNull();
      expect(updatedPetType.isEnabled).toBe(false);
    });

    it('should return 404 if not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/pet-types/${nonExistentId}/disable`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);

      expect(res.body).toMatchObject({
        isSuccess: false,
        message: 'نوع حیوان یافت نشد',
      });
    });
  });

  // =========================================================
  // PATCH /api/pet-types/:id/enable
  // =========================================================

  describe('PATCH /api/pet-types/:id/enable', () => {
    it('should enable pet type', async () => {
      await PetTypeModel.findByIdAndUpdate(testPetType._id, {
        isEnabled: false,
      });

      const res = await request(app)
        .patch(`/api/pet-types/${testPetType._id}/enable`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      expect(res.body.data.isEnabled).toBe(true);

      const updatedPetType = await PetTypeModel.findById(testPetType._id);

      expect(updatedPetType).not.toBeNull();
      expect(updatedPetType.isEnabled).toBe(true);
    });

    it('should return 404 if not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/pet-types/${nonExistentId}/enable`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);

      expect(res.body).toMatchObject({
        isSuccess: false,
        message: 'نوع حیوان یافت نشد',
      });
    });
  });

  // =========================================================
  // DELETE /api/pet-types/:id
  // =========================================================

  describe('DELETE /api/pet-types/:id', () => {
    it('should permanently delete pet type', async () => {
      const res = await request(app)
        .delete(`/api/pet-types/${testPetType._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body).toMatchObject({
        isSuccess: true,
      });

      const deletedPetType = await PetTypeModel.findById(testPetType._id);

      expect(deletedPetType).toBeNull();
    });

    it('should return 404 if not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/pet-types/${nonExistentId}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);

      expect(res.body).toMatchObject({
        isSuccess: false,
        message: 'نوع حیوان یافت نشد',
      });
    });
  });
});
