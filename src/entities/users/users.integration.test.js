jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    void res;

    req.user = {
      userId: global.__TEST_USER_ID__,
      role:
        global.__TEST_USER_ROLE__ ||
        jest.requireActual('#configs/constants.js').ROLES.ADMIN,
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
    createObjectKey: jest.fn(
      (directory, extension) => `${directory}/generated.${extension}`,
    ),
    uploadObject: jest.fn(async ({ key }) => key),
    deleteObject: jest.fn().mockResolvedValue(undefined),
    buildPublicUrl: jest.fn((key) => `https://cdn.example.test/${key}`),
    getObjectKeyFromUrl: jest.fn((url) =>
      url.replace('https://cdn.example.test/', ''),
    ),
  },
}));

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

  createNewQueryParam: jest.fn((queryParams, allowedKeys) => {
    const result = {};

    allowedKeys.forEach((key) => {
      if (queryParams[key] !== undefined) {
        result[key] = queryParams[key];
      }
    });

    return result;
  }),

  getPaginationData: jest.fn(async (Model, query = {}, select = '') => {
    const page = Number(query.page) || 1;

    const limit = Number(query.limit) || 10;

    const sort = query.sort || '-createdAt';

    const filter = {
      ...query,
    };

    delete filter.page;
    delete filter.limit;
    delete filter.sort;

    const totalRecords = await Model.countDocuments(filter);

    let mongoQuery = Model.find(filter);

    if (select) {
      mongoQuery = mongoQuery.select(select);
    }

    const data = await mongoQuery
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      data,
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
    };
  }),

  verifyUser: jest.fn((token, callback) => {
    void token;

    callback({
      userId: global.__TEST_USER_ID__,
    });
  }),
}));

import bcrypt from 'bcryptjs';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import sharp from 'sharp';

import { ROLES, STATUES } from '#configs/constants.js';

import { errorHandler } from '#middlewares/error.middleware.js';
import { ObjectStorageService } from '#services/objectStorage.service.js';

import { UserModel } from './users.model.js';

import usersRoutes from './users.route.js';

describe('User API - Integration Tests', () => {
  let app;
  let testUser;

  const DEFAULT_PASSWORD = 'password123';

  const createTestUser = async (overrides = {}) => {
    const rawPassword = overrides.password || DEFAULT_PASSWORD;

    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    return UserModel.create({
      firstName: 'Mahdi',

      lastName: 'Rashidi',

      phoneNumber: '09123456789',

      password: hashedPassword,

      role: ROLES.CUSTOMER,

      isEnable: true,

      nationalCode: '1234567890',

      address: 'Tehran test address',

      city: 'Tehran',

      province: 'Tehran',

      postalCode: '1234567890',

      age: 25,

      cart: [],

      orders: [],

      ...overrides,
    });
  };

  beforeAll(() => {
    app = express();

    app.use(express.json());

    app.use('/api', usersRoutes);

    app.use(errorHandler);
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});

    testUser = await createTestUser();

    global.__TEST_USER_ID__ = testUser._id.toString();
    global.__TEST_USER_ROLE__ = ROLES.ADMIN;
    ObjectStorageService.deleteObject.mockClear();
    ObjectStorageService.getObjectKeyFromUrl.mockClear();
  });

  afterAll(() => {
    delete global.__TEST_USER_ID__;
    delete global.__TEST_USER_ROLE__;
  });

  // =========================================================
  // POST /api/users
  // =========================================================

  describe('POST /api/users', () => {
    test('should create a new user', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          firstName: 'Ali',

          lastName: 'Ahmadi',

          phoneNumber: '09111111111',

          password: 'password123',

          role: ROLES.CUSTOMER,
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);

      expect(res.body.isSuccess).toBe(true);

      const user = await UserModel.findOne({
        phoneNumber: '09111111111',
      });

      expect(user).not.toBeNull();

      expect(user.firstName).toBe('Ali');

      expect(user.password).not.toBe('password123');

      const passwordCorrect = await bcrypt.compare(
        'password123',
        user.password,
      );

      expect(passwordCorrect).toBe(true);
    });

    test('should return 422 if phone number is missing', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          password: 'password123',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 if password is too short', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          phoneNumber: '09111111111',

          password: '123',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 if phone number already exists', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          phoneNumber: testUser.phoneNumber,

          password: DEFAULT_PASSWORD,
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('کاربری با این مشخصات وجود دارد');
    });
  });

  // =========================================================
  // POST /api/users/login
  // =========================================================

  describe('POST /api/users/login', () => {
    test('should login user', async () => {
      const res = await request(app).post('/api/users/login').send({
        phoneNumber: testUser.phoneNumber,

        password: DEFAULT_PASSWORD,
      });

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.isSuccess).toBe(true);

      expect(res.body.data.accessToken).toBeDefined();

      expect(res.body.data.refreshToken).toBeDefined();
    });

    test('should return 404 if user does not exist', async () => {
      const res = await request(app).post('/api/users/login').send({
        phoneNumber: '09999999999',

        password: DEFAULT_PASSWORD,
      });

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });

    test('should return 422 if password is wrong', async () => {
      const res = await request(app).post('/api/users/login').send({
        phoneNumber: testUser.phoneNumber,

        password: 'wrong-password',
      });

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should return 422 for invalid login input', async () => {
      const res = await request(app).post('/api/users/login').send({
        phoneNumber: '123',

        password: '123',
      });

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // POST /api/users/refresh-token
  // =========================================================

  describe('POST /api/users/refresh-token', () => {
    test('should create a new access token', async () => {
      const res = await request(app)
        .post('/api/users/refresh-token')
        .send({
          refreshToken: 'test-refresh-token',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.CREATED);

      expect(res.body.data.accessToken).toBeDefined();
    });

    test('should return 422 if refresh token is missing', async () => {
      const res = await request(app)
        .post('/api/users/refresh-token')
        .send({})
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // PUT /api/users/edit-info
  // =========================================================

  describe('PUT /api/users/edit-info', () => {
    test('should update personal information', async () => {
      const res = await request(app)
        .put('/api/users/edit-info')
        .send({
          userId: testUser._id.toString(),

          firstName: 'Ali',

          lastName: 'Rashidi',

          email: 'ali@example.com',

          nationalCode: '1234567890',

          age: 26,
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      const updatedUser = await UserModel.findById(testUser._id);

      expect(updatedUser.firstName).toBe('Ali');

      expect(updatedUser.age).toBe(26);
    });

    test('should update form fields and upload an avatar together', async () => {
      const avatar = await sharp({
        create: {
          width: 32,
          height: 32,
          channels: 3,
          background: '#336699',
        },
      })
        .png()
        .toBuffer();

      const res = await request(app)
        .put('/api/users/edit-info')
        .field('firstName', 'Sara')
        .field('lastName', 'Ahmadi')
        .field('email', 'sara@example.com')
        .field('nationalCode', '1234567890')
        .field('age', '29')
        .attach('avatar', avatar, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);
      const expectedAvatarUrl = `https://cdn.example.test/users/${testUser._id}/avatar/generated.webp`;
      expect(res.body.data.avatar).toBe(expectedAvatarUrl);

      const updatedUser = await UserModel.findById(testUser._id);
      expect(updatedUser.firstName).toBe('Sara');
      expect(updatedUser.age).toBe(29);
      expect(updatedUser.avatar).toBe(expectedAvatarUrl);
    });

    test('should reject image MIME claims when the bytes are invalid', async () => {
      const res = await request(app)
        .put('/api/users/edit-info')
        .attach('avatar', Buffer.from('not-an-image'), {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
      expect(res.body.message).toBe('تصویر آواتار ارسال‌شده معتبر نیست');
    });

    test('should let an admin update another user and delete only that user previous avatar', async () => {
      const oldAvatarUrl =
        'https://cdn.example.test/users/other/avatar/old.webp';
      const otherUser = await createTestUser({
        phoneNumber: '09111111111',
        firstName: 'Other',
        avatar: oldAvatarUrl,
      });

      const avatar = await sharp({
        create: {
          width: 32,
          height: 32,
          channels: 3,
          background: '#993366',
        },
      })
        .png()
        .toBuffer();

      const res = await request(app)
        .put('/api/users/edit-info')
        .field('userId', otherUser._id.toString())
        .field('firstName', 'Updated Other')
        .attach('avatar', avatar, {
          filename: 'other-avatar.png',
          contentType: 'image/png',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);
      const authenticatedUser = await UserModel.findById(testUser._id);
      const updatedOtherUser = await UserModel.findById(otherUser._id);
      const expectedAvatarUrl = `https://cdn.example.test/users/${otherUser._id}/avatar/generated.webp`;

      expect(authenticatedUser.firstName).toBe('Mahdi');
      expect(authenticatedUser.avatar).toBe('');
      expect(updatedOtherUser.firstName).toBe('Updated Other');
      expect(updatedOtherUser.avatar).toBe(expectedAvatarUrl);
      expect(ObjectStorageService.createObjectKey).toHaveBeenCalledWith(
        `users/${otherUser._id}/avatar`,
        'webp',
      );
      expect(ObjectStorageService.getObjectKeyFromUrl).toHaveBeenCalledWith(
        oldAvatarUrl,
      );
      expect(ObjectStorageService.deleteObject).toHaveBeenCalledWith(
        'users/other/avatar/old.webp',
      );
    });

    test('should prevent a customer from updating another user', async () => {
      const otherUser = await createTestUser({
        phoneNumber: '09111111111',
        firstName: 'Other',
      });
      global.__TEST_USER_ROLE__ = ROLES.CUSTOMER;

      const res = await request(app)
        .put('/api/users/edit-info')
        .send({
          userId: otherUser._id.toString(),
          firstName: 'Forbidden Update',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NO_ACCESS);
      const unchangedOtherUser = await UserModel.findById(otherUser._id);
      expect(unchangedOtherUser.firstName).toBe('Other');
    });

    test('should return 422 for invalid personal information', async () => {
      const res = await request(app)
        .put('/api/users/edit-info')
        .send({
          userId: testUser._id.toString(),

          firstName: 'A',

          lastName: 'R',

          email: 'invalid-email',

          nationalCode: '123',

          age: 1,
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // PUT /api/users/edit-location-info
  // =========================================================

  describe('PUT /api/users/edit-location-info', () => {
    test('should update location information', async () => {
      const res = await request(app)
        .put('/api/users/edit-location-info')
        .send({
          userId: testUser._id.toString(),

          address: 'New test address',

          city: 'Karaj',

          province: 'Alborz',

          postalCode: '1234567890',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      const updatedUser = await UserModel.findById(testUser._id);

      expect(updatedUser.address).toBe('New test address');

      expect(updatedUser.city).toBe('Karaj');

      expect(updatedUser.province).toBe('Alborz');
    });

    test('should return 422 for invalid location information', async () => {
      const res = await request(app)
        .put('/api/users/edit-location-info')
        .send({
          userId: testUser._id.toString(),

          address: 'x',

          city: 'x',

          province: 'x',

          postalCode: '1234567890',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // PUT /api/users/change-password
  // =========================================================

  describe('PUT /api/users/change-password', () => {
    test('should change password', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .send({
          userId: testUser._id.toString(),

          oldPassword: DEFAULT_PASSWORD,

          password: 'newPassword123',

          repeatPassword: 'newPassword123',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      const updatedUser = await UserModel.findById(testUser._id);

      const isPasswordCorrect = await bcrypt.compare(
        'newPassword123',
        updatedUser.password,
      );

      expect(isPasswordCorrect).toBe(true);
    });

    test('should return 422 if old password is wrong', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .send({
          userId: testUser._id.toString(),

          oldPassword: 'wrongPassword',

          password: 'newPassword123',

          repeatPassword: 'newPassword123',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);

      expect(res.body.message).toContain('کلمه عبور قبلی صحیح نیست');
    });

    test('should return 422 if repeat password does not match', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .send({
          userId: testUser._id.toString(),

          oldPassword: DEFAULT_PASSWORD,

          password: 'newPassword123',

          repeatPassword: 'differentPassword123',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });
  });

  // =========================================================
  // PUT /api/users/disable/:id
  // =========================================================

  describe('PUT /api/users/disable/:id', () => {
    test('should disable user', async () => {
      const res = await request(app)
        .put(`/api/users/disable/${testUser._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      const user = await UserModel.findById(testUser._id);

      expect(user.isEnable).toBe(false);
    });

    test('should return 404 if user does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/users/disable/${id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });
  });

  // =========================================================
  // PUT /api/users/enable/:id
  // =========================================================

  describe('PUT /api/users/enable/:id', () => {
    test('should enable user', async () => {
      await UserModel.findByIdAndUpdate(
        testUser._id,
        {
          $set: {
            isEnable: false,
          },
        },
        {
          returnDocument: 'after',
        },
      );

      const res = await request(app)
        .put(`/api/users/enable/${testUser._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      const user = await UserModel.findById(testUser._id);

      expect(user.isEnable).toBe(true);
    });

    test('should return 404 if user does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/users/enable/${id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });
  });

  // =========================================================
  // GET /api/users/all
  // =========================================================

  describe('GET /api/users/all', () => {
    test('should return all users', async () => {
      await createTestUser({
        phoneNumber: '09111111111',

        firstName: 'Ali',
      });

      const res = await request(app)
        .get('/api/users/all')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(2);

      expect(res.body.totalRecords).toBe(2);
    });

    test('should filter by phoneNumber', async () => {
      await createTestUser({
        phoneNumber: '09111111111',

        firstName: 'Ali',
      });

      const res = await request(app)
        .get('/api/users/all')
        .query({
          phoneNumber: '09111111111',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(1);

      expect(res.body.data[0].phoneNumber).toBe('09111111111');
    });

    test('should filter by fullName', async () => {
      await createTestUser({
        phoneNumber: '09111111111',

        firstName: 'Ali',

        lastName: 'Ahmadi',
      });

      const res = await request(app)
        .get('/api/users/all')
        .query({
          fullName: 'Ali',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(1);

      expect(res.body.data[0].firstName).toBe('Ali');
    });
  });

  // =========================================================
  // GET /api/users/paginate
  // =========================================================

  describe('GET /api/users/paginate', () => {
    test('should return paginated users', async () => {
      await createTestUser({
        phoneNumber: '09111111111',

        firstName: 'Ali',
      });

      const res = await request(app)
        .get('/api/users/paginate')
        .query({
          page: 1,
          limit: 1,
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toBeDefined();

      expect(res.body.data.totalRecords).toBe(2);

      expect(res.body.data.data).toHaveLength(1);
    });
  });

  // =========================================================
  // GET /api/users/:id
  // =========================================================

  describe('GET /api/users/:id', () => {
    test('should return user by id', async () => {
      const res = await request(app)
        .get(`/api/users/${testUser._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data.phoneNumber).toBe(testUser.phoneNumber);

      expect(res.body.data.password).toBeUndefined();
    });

    test('should return 404 if user does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/users/${id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });
  });

  // =========================================================
  // GET /api/users/cart/:id
  // =========================================================

  describe('GET /api/users/cart/:id', () => {
    test('should return user cart', async () => {
      await UserModel.findByIdAndUpdate(
        testUser._id,
        {
          $set: {
            cart: [
              {
                itemId: 'item-1',
                quantity: 2,
              },
            ],
          },
        },
        {
          returnDocument: 'after',
        },
      );

      const res = await request(app)
        .get(`/api/users/cart/${testUser._id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.data).toHaveLength(1);

      expect(res.body.data[0]).toMatchObject({
        itemId: 'item-1',
        quantity: 2,
      });
    });

    test('should return 404 if user does not exist', async () => {
      const id = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/users/cart/${id}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.NOT_FOUND);
    });
  });
});
