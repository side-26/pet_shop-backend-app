jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'temporary-id'),
}));

jest.mock(
  '../../infrastructure/redis/rateLimit/redisRateLimit.store.js',
  () => ({
    RedisRateLimitStore: jest.fn().mockImplementation(() => ({
      consume: jest.fn(),
    })),
  }),
);

jest.mock('../../infrastructure/redis/otp/redisOtp.store.js', () => {
  const findTemporaryToken = jest.fn();
  const deleteTemporaryToken = jest.fn();
  const consumeTemporaryTokenRequest = jest.fn();
  const find = jest.fn();
  const getOrSaveTemporaryToken = jest.fn();
  const releaseReservation = jest.fn();
  const reserve = jest.fn();
  const save = jest.fn();

  return {
    __mockRedisTemporaryTokenConsume: consumeTemporaryTokenRequest,
    __mockRedisTemporaryTokenFind: findTemporaryToken,
    __mockRedisTemporaryTokenDelete: deleteTemporaryToken,
    __mockRedisOtpFind: find,
    __mockRedisTemporaryTokenGetOrSave: getOrSaveTemporaryToken,
    __mockRedisOtpReleaseReservation: releaseReservation,
    __mockRedisOtpReserve: reserve,
    __mockRedisOtpSave: save,
    createUserOtpKey: jest.fn(
      ({ phoneNumber, ip }) =>
        `otp:users:${phoneNumber}:${encodeURIComponent(ip.toLowerCase())}`,
    ),
    createUserTemporaryTokenKey: jest.fn(
      (phoneNumber) => `temporary-token:users:${phoneNumber}`,
    ),
    createUserTemporaryTokenRateLimitKey: jest.fn(
      ({ phoneNumber, ip }) =>
        `rate-limit:temporary-token:users:${phoneNumber}:${encodeURIComponent(ip.toLowerCase())}`,
    ),
    RedisOtpStore: jest.fn(() => ({
      consumeTemporaryTokenRequest,
      find,
      getOrSaveTemporaryToken,
      releaseReservation,
      findTemporaryToken,
      deleteTemporaryToken,
      reserve,
      save,
    })),
  };
});

jest.mock('../../integrations/otpCode/otpCode.service.js', () => ({
  OtpCodeService: { send: jest.fn() },
}));

jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    if (global.__TEST_UNAUTHENTICATED__) {
      return res.status(401).json({ isSuccess: false });
    }

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

  verifyRefreshToken: jest.fn((token, callback) => {
    void token;

    callback({
      userId: global.__TEST_USER_ID__,
    });
  }),
}));

import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import sharp from 'sharp';

import {
  METHODS,
  RATE_LIMIT,
  ROLES,
  STATUES,
  USER_OTP,
  USER_TEMPORARY_TOKEN,
} from '#configs/constants.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { ProductModel } from '#entities/products/products.model.js';

import { errorHandler } from '#middlewares/error.middleware.js';
import { apiMethodMiddleware } from '#middlewares/method.middleware.js';
import { ObjectStorageService } from '#services/objectStorage.service.js';

import { OtpCodeService } from '../../integrations/otpCode/otpCode.service.js';
import {
  __mockRedisTemporaryTokenConsume as mockRedisTemporaryTokenConsume,
  __mockRedisTemporaryTokenFind as mockRedisTemporaryTokenFind,
  __mockRedisTemporaryTokenDelete as mockRedisTemporaryTokenDelete,
  __mockRedisOtpFind as mockRedisOtpFind,
  __mockRedisTemporaryTokenGetOrSave as mockRedisTemporaryTokenGetOrSave,
  __mockRedisOtpReleaseReservation as mockRedisOtpReleaseReservation,
  __mockRedisOtpReserve as mockRedisOtpReserve,
  __mockRedisOtpSave as mockRedisOtpSave,
} from '../../infrastructure/redis/otp/redisOtp.store.js';
import { RedisRateLimitStore } from '../../infrastructure/redis/rateLimit/redisRateLimit.store.js';
import { UserModel } from './users.model.js';

import usersRoutes from './users.route.js';

describe('User API - Integration Tests', () => {
  let app;
  let mockRedisRateLimitConsume;
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

      age: 25,

      cart: { items: [] },

      orders: [],

      ...overrides,
    });
  };

  const createAddressBody = (overrides = {}) => ({
    province: 'Tehran',
    city: 'Tehran',
    detailAddress: 'Example detailed address',
    plate: '12',
    postalCode: '1234567890',
    receiverIsMe: false,
    firstName: 'Ali',
    lastName: 'Ahmadi',
    nationalCode: '1234567890',
    phoneNumber: '09121234567',
    ...overrides,
  });

  beforeAll(() => {
    app = express();

    app.use('/api', apiMethodMiddleware);
    app.use(express.json());

    app.use('/api', usersRoutes);

    app.use(errorHandler);
  });

  beforeEach(async () => {
    mockRedisRateLimitConsume =
      RedisRateLimitStore.mock.results[0].value.consume;
    mockRedisRateLimitConsume.mockReset().mockResolvedValue({
      allowed: true,
      current: 1,
      remaining: RATE_LIMIT.USER_MAX_REQUESTS - 1,
      limit: RATE_LIMIT.USER_MAX_REQUESTS,
      retryAfter: RATE_LIMIT.USER_WINDOW_SECONDS,
    });
    mockRedisOtpFind.mockReset().mockResolvedValue(null);
    mockRedisOtpReserve.mockReset().mockResolvedValue({
      acquired: true,
      remainingSeconds: USER_OTP.RESERVATION_TTL_SECONDS,
    });
    mockRedisOtpReleaseReservation.mockReset().mockResolvedValue(true);
    mockRedisOtpSave.mockReset().mockResolvedValue(USER_OTP.TTL_SECONDS);
    mockRedisTemporaryTokenConsume.mockReset().mockResolvedValue({
      allowed: true,
      current: 1,
      remaining: USER_TEMPORARY_TOKEN.MAX_REQUESTS - 1,
      retryAfter: USER_TEMPORARY_TOKEN.TTL_SECONDS,
    });
    mockRedisTemporaryTokenGetOrSave.mockReset().mockResolvedValue({
      temporaryToken: 'temporary-token',
      remainingSeconds: USER_TEMPORARY_TOKEN.TTL_SECONDS,
    });
    OtpCodeService.send.mockReset().mockResolvedValue({
      code: '123456',
      status: '',
    });

    mockRedisTemporaryTokenFind.mockReset().mockResolvedValue(null);
    mockRedisTemporaryTokenDelete.mockReset().mockResolvedValue(true);
    await Promise.all([
      UserModel.deleteMany({}),
      ProductModel.deleteMany({}),
      PetModel.deleteMany({}),
    ]);

    testUser = await createTestUser();

    global.__TEST_USER_ID__ = testUser._id.toString();
    global.__TEST_USER_ROLE__ = ROLES.ADMIN;
    global.__TEST_UNAUTHENTICATED__ = false;
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

          address: 'legacy address',

          city: 'legacy city',

          province: 'legacy province',

          postalCode: '1234567890',

          addresses: [createAddressBody()],
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

      expect(user.addresses).toEqual([]);

      expect(user.toObject()).not.toHaveProperty('address');

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
  // POST /api/users/register
  // =========================================================

  describe('POST /api/users/register', () => {
    test('should publicly create a customer account without returning data', async () => {
      const credentials = {
        phoneNumber: '09111111111',
        password: 'password123',
      };

      const res = await request(app)
        .post('/api/users/register')
        .send(credentials);

      expect(res.status).toBe(STATUES.CREATED);
      expect(res.body).toEqual({
        isSuccess: true,
        message: 'حساب کاربری شما با موفقیت ساخته شد لطفا وارد اپلیکیشن شوید',
      });

      const user = await UserModel.findOne({
        phoneNumber: credentials.phoneNumber,
      });
      expect(user.role).toBe(ROLES.CUSTOMER);
      await expect(
        bcrypt.compare(credentials.password, user.password),
      ).resolves.toBe(true);
    });

    test.each([
      [{ password: 'password123' }],
      [{ phoneNumber: '09111111111', password: '123' }],
      [{ phoneNumber: '123', password: 'password123' }],
      [
        {
          phoneNumber: '09111111111',
          password: 'password123',
          role: ROLES.ADMIN,
        },
      ],
    ])('should reject invalid registration body %p', async (body) => {
      const res = await request(app).post('/api/users/register').send(body);

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('should reject an existing phone number', async () => {
      const res = await request(app).post('/api/users/register').send({
        phoneNumber: testUser.phoneNumber,
        password: DEFAULT_PASSWORD,
      });

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
      expect(res.body.message).toContain('کاربری با این مشخصات وجود دارد');
    });

    test.each(['get', 'put', 'patch', 'delete'])(
      'should return 405 instead of matching another route for %s',
      async (method) => {
        const res = await request(app)[method]('/api/users/register');

        expect(res.status).toBe(STATUES.METHOD_NOT_ALLOWED);
        expect(res.headers.allow).toBe(METHODS.post);
        expect(res.body.message).toBe('متد درخواست برای این مسیر مجاز نیست');
      },
    );
  });

  // =========================================================
  // POST /api/users/send-otp
  // =========================================================

  describe('POST /api/users/send-otp', () => {
    test('should send and store a hashed OTP for an existing phone and requester IP', async () => {
      const res = await request(app).post('/api/users/send-otp').send({
        phoneNumber: testUser.phoneNumber,
      });

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(res.body).toEqual({
        isSuccess: true,
        message: 'کد تأیید با موفقیت ارسال شد',
        data: { remainingSeconds: USER_OTP.TTL_SECONDS },
      });
      expect(OtpCodeService.send).toHaveBeenCalledWith({
        to: testUser.phoneNumber,
      });
      expect(mockRedisOtpReserve).toHaveBeenCalledWith({
        key: expect.stringMatching(
          new RegExp(`^otp:users:${testUser.phoneNumber}:`),
        ),
        reservationId: expect.stringMatching(/^pending:/),
        ttlSeconds: USER_OTP.RESERVATION_TTL_SECONDS,
      });
      expect(mockRedisOtpSave).toHaveBeenCalledWith({
        key: expect.stringMatching(
          new RegExp(`^otp:users:${testUser.phoneNumber}:`),
        ),
        reservationId: expect.stringMatching(/^pending:/),
        hashedCode: expect.any(String),
        ttlSeconds: USER_OTP.TTL_SECONDS,
      });

      const [{ hashedCode }] = mockRedisOtpSave.mock.calls[0];
      await expect(bcrypt.compare('123456', hashedCode)).resolves.toBe(true);
      expect(res.body).not.toHaveProperty('code');
      expect(res.body.data).not.toHaveProperty('code');
    });

    test('should return the active reservation TTL and warning without sending another OTP', async () => {
      mockRedisOtpReserve.mockResolvedValue({
        acquired: false,
        remainingSeconds: 73,
      });

      const res = await request(app).post('/api/users/send-otp').send({
        phoneNumber: testUser.phoneNumber,
      });

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(res.body).toEqual({
        isSuccess: true,
        message:
          'کد تأیید در حال ارسال است یا قبلاً ارسال شده است؛ لطفاً پس از 73 ثانیه دوباره تلاش کنید',
        data: { remainingSeconds: 73 },
      });
      expect(OtpCodeService.send).not.toHaveBeenCalled();
      expect(mockRedisOtpSave).not.toHaveBeenCalled();
    });

    test('should allow only one provider call for concurrent OTP requests', async () => {
      mockRedisOtpReserve
        .mockResolvedValueOnce({
          acquired: true,
          remainingSeconds: USER_OTP.RESERVATION_TTL_SECONDS,
        })
        .mockResolvedValueOnce({
          acquired: false,
          remainingSeconds: USER_OTP.RESERVATION_TTL_SECONDS,
        });

      const sendRequest = () =>
        request(app).post('/api/users/send-otp').send({
          phoneNumber: testUser.phoneNumber,
        });
      const responses = await Promise.all([sendRequest(), sendRequest()]);

      expect(responses.map(({ status }) => status)).toEqual([
        STATUES.SUCCESS,
        STATUES.SUCCESS,
      ]);
      expect(OtpCodeService.send).toHaveBeenCalledTimes(1);
      expect(mockRedisOtpSave).toHaveBeenCalledTimes(1);
      expect(
        responses.some(({ body }) => body.message.includes('دوباره تلاش کنید')),
      ).toBe(true);
    });

    test('should return 404 without sending an OTP for an unknown phone', async () => {
      const res = await request(app).post('/api/users/send-otp').send({
        phoneNumber: '09999999999',
      });

      expect(res.status).toBe(STATUES.NOT_FOUND);
      expect(res.body.message).toBe('کاربری با این شماره تلفن یافت نشد');
      expect(OtpCodeService.send).not.toHaveBeenCalled();
      expect(mockRedisOtpReserve).not.toHaveBeenCalled();
      expect(mockRedisOtpSave).not.toHaveBeenCalled();
    });

    test.each([
      {},
      { phoneNumber: '123' },
      { phoneNumber: '09123456789', unexpected: true },
    ])('should reject invalid request body %p', async (body) => {
      const res = await request(app).post('/api/users/send-otp').send(body);

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
      expect(OtpCodeService.send).not.toHaveBeenCalled();
      expect(mockRedisOtpSave).not.toHaveBeenCalled();
    });

    test.each(['get', 'put', 'patch', 'delete'])(
      'should return 405 for the unsupported %s method',
      async (method) => {
        const res = await request(app)[method]('/api/users/send-otp');

        expect(res.status).toBe(STATUES.METHOD_NOT_ALLOWED);
        expect(res.headers.allow).toBe(METHODS.post);
        expect(res.body.message).toBe('متد درخواست برای این مسیر مجاز نیست');
      },
    );
  });

  // =========================================================
  // POST /api/users/verify
  // =========================================================

  describe('POST /api/users/verify', () => {
    test('should return login data without a success message', async () => {
      mockRedisOtpFind.mockResolvedValue({
        hashedCode: await bcrypt.hash('123456', 4),
        remainingSeconds: 75,
      });

      const res = await request(app).post('/api/users/verify').send({
        phoneNumber: testUser.phoneNumber,
        'otp-code': '123456',
      });

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(res.body).toMatchObject({
        isSuccess: true,
        data: {
          userId: testUser._id.toString(),
          role: testUser.role,
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          accessExp: expect.any(Number),
          sessionExp: expect.any(Number),
        },
      });
      expect(res.body).not.toHaveProperty('message');
      expect(mockRedisOtpFind).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(`^otp:users:${testUser.phoneNumber}:`),
        ),
      );
    });

    test('should return and cache a five-minute reset token', async () => {
      mockRedisOtpFind.mockResolvedValue({
        hashedCode: await bcrypt.hash('123456', 4),
        remainingSeconds: 75,
      });

      const res = await request(app).post('/api/users/verify').send({
        phoneNumber: testUser.phoneNumber,
        'otp-code': '123456',
        'reset-password': true,
      });

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(res.body).toMatchObject({
        isSuccess: true,
        message: 'کد تأیید شما معتبر است',
        data: {
          temporaryToken: expect.any(String),
          expiry: USER_TEMPORARY_TOKEN.TTL_SECONDS,
        },
      });
      expect(mockRedisTemporaryTokenGetOrSave).toHaveBeenCalledWith({
        key: `temporary-token:users:${testUser.phoneNumber}`,
        temporaryToken: expect.any(String),
        ttlSeconds: USER_TEMPORARY_TOKEN.TTL_SECONDS,
      });
    });

    test('should return the current Redis token on a repeated request', async () => {
      mockRedisOtpFind.mockResolvedValue({
        hashedCode: await bcrypt.hash('123456', 4),
        remainingSeconds: 75,
      });
      mockRedisTemporaryTokenGetOrSave.mockResolvedValue({
        temporaryToken: 'current-temporary-token',
        remainingSeconds: 241,
      });

      const res = await request(app).post('/api/users/verify').send({
        phoneNumber: testUser.phoneNumber,
        'otp-code': '123456',
        'reset-password': true,
      });

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(res.body.data).toEqual({
        temporaryToken: 'current-temporary-token',
        expiry: 241,
      });
    });

    test('should return 403 after three reset-token requests', async () => {
      mockRedisOtpFind.mockResolvedValue({
        hashedCode: await bcrypt.hash('123456', 4),
        remainingSeconds: 75,
      });
      mockRedisTemporaryTokenConsume.mockResolvedValue({
        allowed: false,
        current: 4,
        remaining: 0,
        retryAfter: 238,
      });

      const res = await request(app).post('/api/users/verify').send({
        phoneNumber: testUser.phoneNumber,
        'otp-code': '123456',
        'reset-password': true,
      });

      expect(res.status).toBe(STATUES.NO_ACCESS);
      expect(res.body.message).toBe('شما دسترسی لازم را ندارید');
      expect(mockRedisTemporaryTokenGetOrSave).not.toHaveBeenCalled();
    });

    test('should ask for a new code when the Redis key expired', async () => {
      const res = await request(app).post('/api/users/verify').send({
        phoneNumber: testUser.phoneNumber,
        'otp-code': '123456',
      });

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
      expect(res.body.message).toBe(
        'کد تأیید منقضی شده است؛ لطفاً کد را دوباره ارسال کرده و سپس تلاش کنید',
      );
    });

    test.each([
      {},
      { phoneNumber: '123', 'otp-code': '123456' },
      { phoneNumber: '09123456789' },
      { phoneNumber: '09123456789', 'otp-code': '12345' },
      {
        phoneNumber: '09123456789',
        'otp-code': '123456',
        'reset-password': 'true',
      },
    ])('should reject invalid request body %p', async (body) => {
      const res = await request(app).post('/api/users/verify').send(body);

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
      expect(mockRedisOtpFind).not.toHaveBeenCalled();
    });
  });
  // =========================================================
  // POST /api/users/reset-password
  // =========================================================

  describe('POST /api/users/reset-password', () => {
    const issueTemporaryToken = async () => {
      mockRedisOtpFind.mockResolvedValue({
        hashedCode: await bcrypt.hash('123456', 4),
        remainingSeconds: 75,
      });
      mockRedisTemporaryTokenGetOrSave.mockImplementation(
        async ({ temporaryToken }) => ({
          temporaryToken,
          remainingSeconds: USER_TEMPORARY_TOKEN.TTL_SECONDS,
        }),
      );

      const verification = await request(app).post('/api/users/verify').send({
        phoneNumber: testUser.phoneNumber,
        'otp-code': '123456',
        'reset-password': true,
      });

      return verification.body.data.temporaryToken;
    };

    test('should reset the password and invalidate the matching token', async () => {
      const temporaryToken = await issueTemporaryToken();
      mockRedisTemporaryTokenFind.mockResolvedValue({
        temporaryToken,
        remainingSeconds: USER_TEMPORARY_TOKEN.TTL_SECONDS,
      });

      const res = await request(app)
        .post('/api/users/reset-password')
        .set('Authorization', `Bearer ${temporaryToken}`)
        .send({
          newPassword: 'new-password-123',
          confirmPassword: 'new-password-123',
        });

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(res.body).toEqual({
        isSuccess: true,
        message: 'کلمه عبور شما با موفقیت بازنشانی شد',
        data: true,
      });
      const updatedUser = await UserModel.findById(testUser._id);
      await expect(
        bcrypt.compare('new-password-123', updatedUser.password),
      ).resolves.toBe(true);
      expect(mockRedisTemporaryTokenDelete).toHaveBeenCalledWith({
        key: `temporary-token:users:${testUser.phoneNumber}`,
        temporaryToken,
      });
    });

    test.each([
      {},
      { newPassword: 'short', confirmPassword: 'short' },
      {
        newPassword: 'new-password-123',
        confirmPassword: 'different-password',
      },
      {
        newPassword: 'new-password-123',
        confirmPassword: 'new-password-123',
        unexpected: true,
      },
    ])('should reject invalid request body %p', async (body) => {
      const res = await request(app)
        .post('/api/users/reset-password')
        .send(body);

      expect(res.status).toBe(STATUES.BAD_FORM_VALIDATION);
      expect(mockRedisTemporaryTokenFind).not.toHaveBeenCalled();
    });

    test('should return 403 when the Bearer token is missing', async () => {
      const res = await request(app).post('/api/users/reset-password').send({
        newPassword: 'new-password-123',
        confirmPassword: 'new-password-123',
      });

      expect(res.status).toBe(STATUES.NO_ACCESS);
      expect(res.body.message).toBe('شما دسترسی لازم را ندارید');
    });

    test('should return 405 for unsupported methods', async () => {
      const res = await request(app).put('/api/users/reset-password');

      expect(res.status).toBe(STATUES.METHOD_NOT_ALLOWED);
      expect(res.headers.allow).toBe(METHODS.post.toUpperCase());
    });
  });

  // =========================================================
  // Users-router rate-limit policies
  // =========================================================

  describe('users-router Redis rate limits', () => {
    test('should apply the standard three-request six-minute policy', async () => {
      const res = await request(app)
        .get('/api/users/all')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(mockRedisRateLimitConsume).toHaveBeenCalledWith({
        key: expect.stringContaining('rate-limit:users:GET:/api/users/all:'),
        limit: RATE_LIMIT.USER_MAX_REQUESTS,
        window: RATE_LIMIT.USER_WINDOW_SECONDS,
      });
      expect(res.headers['ratelimit-limit']).toBe(
        String(RATE_LIMIT.USER_MAX_REQUESTS),
      );
      expect(res.headers['ratelimit-remaining']).toBe(
        String(RATE_LIMIT.USER_MAX_REQUESTS - 1),
      );
    });

    test('should stop a standard route when its Redis bucket is exhausted', async () => {
      mockRedisRateLimitConsume.mockResolvedValueOnce({
        allowed: false,
        current: RATE_LIMIT.USER_MAX_REQUESTS + 1,
        remaining: 0,
        limit: RATE_LIMIT.USER_MAX_REQUESTS,
        retryAfter: 75,
      });

      const res = await request(app)
        .get('/api/users/all')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.TOO_MANY_REQUESTS);
      expect(res.headers['ratelimit-limit']).toBe(
        String(RATE_LIMIT.USER_MAX_REQUESTS),
      );
      expect(res.headers['ratelimit-remaining']).toBe('0');
      expect(res.headers['retry-after']).toBe('75');
    });
  });

  // =========================================================
  // POST /api/users/login
  // =========================================================

  describe('POST /api/users/login', () => {
    test('should apply the three-request two-minute Redis policy', async () => {
      const res = await request(app).post('/api/users/login').send({
        phoneNumber: testUser.phoneNumber,
        password: DEFAULT_PASSWORD,
      });

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(mockRedisRateLimitConsume).toHaveBeenCalledWith({
        key: expect.stringContaining('rate-limit:users:POST:/api/users/login:'),
        limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
        window: RATE_LIMIT.LOGIN_WINDOW_SECONDS,
      });
      expect(res.headers['ratelimit-limit']).toBe(
        String(RATE_LIMIT.LOGIN_MAX_REQUESTS),
      );
      expect(res.headers['ratelimit-remaining']).toBe(
        String(RATE_LIMIT.LOGIN_MAX_REQUESTS - 1),
      );
    });

    test('should return 429 after three login requests in the same window', async () => {
      mockRedisRateLimitConsume
        .mockResolvedValueOnce({
          allowed: true,
          current: 1,
          remaining: 2,
          limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
          retryAfter: RATE_LIMIT.LOGIN_WINDOW_SECONDS,
        })
        .mockResolvedValueOnce({
          allowed: true,
          current: 2,
          remaining: 1,
          limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
          retryAfter: RATE_LIMIT.LOGIN_WINDOW_SECONDS,
        })
        .mockResolvedValueOnce({
          allowed: true,
          current: 3,
          remaining: 0,
          limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
          retryAfter: RATE_LIMIT.LOGIN_WINDOW_SECONDS,
        })
        .mockResolvedValueOnce({
          allowed: false,
          current: 4,
          remaining: 0,
          limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
          retryAfter: 90,
        });

      const sendLoginRequest = () =>
        request(app).post('/api/users/login').send({
          phoneNumber: testUser.phoneNumber,
          password: DEFAULT_PASSWORD,
        });

      const responses = [];

      for (let attempt = 0; attempt < 4; attempt += 1) {
        responses.push(await sendLoginRequest());
      }

      expect(responses.map(({ status }) => status)).toEqual([
        STATUES.SUCCESS,
        STATUES.SUCCESS,
        STATUES.SUCCESS,
        STATUES.TOO_MANY_REQUESTS,
      ]);
      expect(responses[3].headers['ratelimit-limit']).toBe('3');
      expect(responses[3].headers['ratelimit-remaining']).toBe('0');
      expect(responses[3].headers['retry-after']).toBe('90');
    });

    test('should login user', async () => {
      const res = await request(app).post('/api/users/login').send({
        phoneNumber: testUser.phoneNumber,

        password: DEFAULT_PASSWORD,
      });

      expect(res.status).toBe(STATUES.SUCCESS);

      expect(res.body.isSuccess).toBe(true);

      expect(res.body.data.accessToken).toBeDefined();

      expect(res.body.data.refreshToken).toBeDefined();

      expect(res.body.data.userId).toBe(testUser._id.toString());

      expect(res.body.data.role).toBe(testUser.role);

      expect(res.body.data.accessExp).toEqual(expect.any(Number));

      expect(res.body.data.sessionExp).toEqual(expect.any(Number));

      expect(res.body.data.accessExp).toBe(
        jwt.decode(res.body.data.accessToken).exp * 1000,
      );

      expect(res.body.data.sessionExp).toBe(
        jwt.decode(res.body.data.refreshToken).exp * 1000,
      );

      expect(res.body.data.accessExp).toBeGreaterThan(Date.now());

      expect(res.body.data.sessionExp).toBeGreaterThan(res.body.data.accessExp);
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
  // USER ADDRESSES
  // =========================================================

  describe('authenticated user addresses', () => {
    test('legacy root address fields are no longer persisted', async () => {
      const user = await createTestUser({
        phoneNumber: '09120000001',
        address: 'legacy',
        city: 'legacy',
        province: 'legacy',
        postalCode: '1234567890',
      });

      expect(user.toObject()).not.toHaveProperty('address');
      expect(user.toObject()).not.toHaveProperty('city');
      expect(user.toObject()).not.toHaveProperty('province');
      expect(user.toObject()).not.toHaveProperty('postalCode');
      expect(user.addresses).toEqual([]);
    });

    test('creates an address without an optional unit', async () => {
      const response = await request(app)
        .post('/api/users/addresses')
        .set('Authorization', 'Bearer token')
        .send(createAddressBody());

      expect(response.status).toBe(STATUES.CREATED);
      expect(response.body.data).toMatchObject(createAddressBody());
      expect(response.body.data._id).toBeDefined();
      const user = await UserModel.findById(testUser._id);
      expect(user.addresses).toHaveLength(1);
    });

    test('receiverIsMe snapshots authenticated user identity and ignores request identity', async () => {
      const response = await request(app)
        .post('/api/users/addresses')
        .set('Authorization', 'Bearer token')
        .send(
          createAddressBody({
            receiverIsMe: true,
            firstName: 'Wrong',
            lastName: 'Receiver',
            nationalCode: '0000000000',
            phoneNumber: '09999999999',
          }),
        );

      expect(response.status).toBe(STATUES.CREATED);
      expect(response.body.data).toMatchObject({
        receiverIsMe: true,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        nationalCode: testUser.nationalCode,
        phoneNumber: testUser.phoneNumber,
      });
    });

    test('rejects another receiver with incomplete or invalid information', async () => {
      for (const invalid of [
        { firstName: undefined },
        { nationalCode: '123' },
        { phoneNumber: '12345678901' },
        { postalCode: '123' },
        { postalCode: '123456789' },
        { postalCode: '12345678901' },
        { postalCode: 'abcdefghij' },
      ]) {
        const response = await request(app)
          .post('/api/users/addresses')
          .set('Authorization', 'Bearer token')
          .send(createAddressBody(invalid));
        expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
      }
    });

    test.each(['province', 'city', 'detailAddress', 'plate', 'postalCode'])(
      'rejects an address missing %s',
      async (field) => {
        const body = createAddressBody();
        delete body[field];

        const response = await request(app)
          .post('/api/users/addresses')
          .set('Authorization', 'Bearer token')
          .send(body);
        expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
      },
    );

    test('atomically enforces five addresses and unique subdocument ids', async () => {
      const responses = await Promise.all(
        Array.from({ length: 6 }, (_, index) =>
          request(app)
            .post('/api/users/addresses')
            .set('Authorization', 'Bearer token')
            .send(createAddressBody({ plate: String(index + 1) })),
        ),
      );
      expect(
        responses.filter(({ status }) => status === STATUES.CREATED),
      ).toHaveLength(5);
      expect(
        responses.filter(
          ({ status }) => status === STATUES.BAD_FORM_VALIDATION,
        ),
      ).toHaveLength(1);

      const user = await UserModel.findById(testUser._id);
      expect(user.addresses).toHaveLength(5);
      expect(new Set(user.addresses.map(({ id }) => id)).size).toBe(5);
    });

    test('rejects receiverIsMe when current user identity is incomplete', async () => {
      testUser.firstName = '';
      await testUser.save();

      const response = await request(app)
        .post('/api/users/addresses')
        .set('Authorization', 'Bearer token')
        .send(createAddressBody({ receiverIsMe: true }));
      expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('partially edits only the selected owned address', async () => {
      testUser.addresses.push(
        createAddressBody({ plate: '10' }),
        createAddressBody({ plate: '20' }),
      );
      await testUser.save();
      const [target, untouched] = testUser.addresses;

      const response = await request(app)
        .patch(`/api/users/addresses/${target._id}`)
        .set('Authorization', 'Bearer token')
        .send({ plate: '25' });

      expect(response.status).toBe(STATUES.SUCCESS);
      const user = await UserModel.findById(testUser._id);
      expect(user.addresses.id(target._id).plate).toBe('25');
      expect(user.addresses.id(target._id).city).toBe('Tehran');
      expect(user.addresses.id(untouched._id).plate).toBe('20');
    });

    test('switches receiver modes without retaining stale receiver data', async () => {
      testUser.addresses.push(createAddressBody());
      await testUser.save();
      const addressId = testUser.addresses[0]._id;

      const toMe = await request(app)
        .patch(`/api/users/addresses/${addressId}`)
        .set('Authorization', 'Bearer token')
        .send({ receiverIsMe: true });
      expect(toMe.body.data.firstName).toBe(testUser.firstName);

      const incomplete = await request(app)
        .patch(`/api/users/addresses/${addressId}`)
        .set('Authorization', 'Bearer token')
        .send({ receiverIsMe: false });
      expect(incomplete.status).toBe(STATUES.BAD_FORM_VALIDATION);

      const toOther = await request(app)
        .patch(`/api/users/addresses/${addressId}`)
        .set('Authorization', 'Bearer token')
        .send({
          receiverIsMe: false,
          firstName: 'Sara',
          lastName: 'Ahmadi',
          nationalCode: '0987654321',
          phoneNumber: '09121111111',
        });
      expect(toOther.status).toBe(STATUES.SUCCESS);
      expect(toOther.body.data.firstName).toBe('Sara');
    });

    test('cannot edit another user address and only lists own addresses', async () => {
      const otherUser = await createTestUser({ phoneNumber: '09120000002' });
      otherUser.addresses.push(createAddressBody({ plate: '99' }));
      await otherUser.save();
      testUser.addresses.push(createAddressBody({ plate: '11' }));
      await testUser.save();

      const editResponse = await request(app)
        .patch(`/api/users/addresses/${otherUser.addresses[0]._id}`)
        .set('Authorization', 'Bearer token')
        .send({ plate: 'changed' });
      expect(editResponse.status).toBe(STATUES.NOT_FOUND);

      const listResponse = await request(app)
        .get('/api/users/addresses')
        .set('Authorization', 'Bearer token');
      expect(listResponse.status).toBe(STATUES.SUCCESS);
      expect(listResponse.body.totalRecords).toBe(1);
      expect(listResponse.body.data[0].plate).toBe('11');
      expect(listResponse.body).not.toHaveProperty('password');

      const unchangedOther = await UserModel.findById(otherUser._id);
      expect(unchangedOther.addresses[0].plate).toBe('99');
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
      mockRedisRateLimitConsume.mockResolvedValueOnce({
        allowed: true,
        current: 1,
        remaining: RATE_LIMIT.USER_PAGINATE_MAX_REQUESTS - 1,
        limit: RATE_LIMIT.USER_PAGINATE_MAX_REQUESTS,
        retryAfter: RATE_LIMIT.USER_PAGINATE_WINDOW_SECONDS,
      });
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
      expect(mockRedisRateLimitConsume).toHaveBeenCalledWith({
        key: expect.stringContaining(
          'rate-limit:users:GET:/api/users/paginate:',
        ),
        limit: RATE_LIMIT.USER_PAGINATE_MAX_REQUESTS,
        window: RATE_LIMIT.USER_PAGINATE_WINDOW_SECONDS,
      });
      expect(res.headers['ratelimit-limit']).toBe(
        String(RATE_LIMIT.USER_PAGINATE_MAX_REQUESTS),
      );
      expect(res.headers['ratelimit-remaining']).toBe(
        String(RATE_LIMIT.USER_PAGINATE_MAX_REQUESTS - 1),
      );
    });

    test('should filter paginated users by isEnable query string', async () => {
      await createTestUser({
        phoneNumber: '09111111111',
        isEnable: false,
      });

      const res = await request(app)
        .get('/api/users/paginate')
        .query({
          page: 1,
          limit: 20,
          isEnable: 'true',
        })
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(STATUES.SUCCESS);
      expect(res.body.data.totalRecords).toBe(1);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0].isEnable).toBe(true);
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

  describe('authenticated cart and wishlist', () => {
    const createReferencedItem = async (Model, slug, overrides = {}) => {
      const item = {
        _id: new mongoose.Types.ObjectId(),
        title: slug,
        mainImage: 'https://example.test/main.webp',
        mainImageThumbnail: 'https://example.test/thumb.webp',
        images: [],
        description: 'valid description',
        quantity: 10,
        price: 100,
        discountPercentage: 0,
        enable: true,
        slug,
        category: new mongoose.Types.ObjectId(),
        petType: new mongoose.Types.ObjectId(),
        breed: new mongoose.Types.ObjectId(),
        ...overrides,
      };
      await Model.collection.insertOne(item);
      return item;
    };

    test('creates the structured cart with safe checkout defaults', async () => {
      const user = await UserModel.findById(testUser._id);
      expect(user.cart).toMatchObject({
        totalPrice: 0,
        items: [],
        discountPrice: 0,
        userAddress: null,
        deliveringDateToShipping: null,
        shippingPrice: 0,
        paymentType: 1,
        instalmentCompany: null,
      });
      expect(user.cart.shippingInfo).toMatchObject({
        name: '',
        trackingCode: '',
        estimateDeliveryDate: null,
      });
    });

    test.each([
      ['product', ProductModel],
      ['pet', PetModel],
    ])('adds, lists, and deletes a %s cart item', async (itemType, Model) => {
      const referenced = await createReferencedItem(Model, `${itemType}-cart`);
      const addResponse = await request(app)
        .post('/api/cart/add')
        .set('Authorization', 'Bearer token')
        .send({ itemId: referenced._id.toString(), itemType, quantity: 5 });

      expect(addResponse.status).toBe(STATUES.CREATED);
      expect(addResponse.body.data).toMatchObject({
        totalPrice: 500,
        discountPrice: 0,
      });
      expect(addResponse.body.data.items[0]).toMatchObject({
        itemType,
        quantity: 5,
      });

      await request(app)
        .post('/api/cart/add')
        .set('Authorization', 'Bearer token')
        .send({ itemId: referenced._id.toString(), itemType, quantity: 7 });

      const listResponse = await request(app)
        .get('/api/cart/all')
        .set('Authorization', 'Bearer token');
      expect(listResponse.body.data.items).toHaveLength(1);
      expect(listResponse.body.data).toMatchObject({
        totalPrice: 1200,
        discountPrice: 0,
      });
      expect(listResponse.body.data.items[0]).toMatchObject({
        itemType,
        quantity: 12,
      });
      expect(listResponse.body.data.items[0].item.title).toBe(
        `${itemType}-cart`,
      );

      const deleteResponse = await request(app)
        .delete(`/api/cart/delete/${listResponse.body.data.items[0]._id}`)
        .set('Authorization', 'Bearer token');
      expect(deleteResponse.status).toBe(STATUES.SUCCESS);
      expect(deleteResponse.body.data).toMatchObject({
        items: [],
        totalPrice: 0,
        discountPrice: 0,
      });
    });

    test.each([0, -1, 1.5])('rejects cart quantity %s', async (quantity) => {
      const response = await request(app)
        .post('/api/cart/add')
        .set('Authorization', 'Bearer token')
        .send({
          itemId: new mongoose.Types.ObjectId().toString(),
          itemType: 'product',
          quantity,
        });
      expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
    });

    test('calculates mixed Product/Pet totals and discounts from current database prices', async () => {
      const product = await createReferencedItem(
        ProductModel,
        'priced-product',
        { price: 100, discountPercentage: 10 },
      );
      const pet = await createReferencedItem(PetModel, 'priced-pet', {
        price: 200,
        discountPercentage: 20,
      });

      await request(app)
        .post('/api/cart/add')
        .set('Authorization', 'Bearer token')
        .send({
          itemId: product._id.toString(),
          itemType: 'product',
          quantity: 2,
          totalPrice: 1,
          discountPrice: 999999,
        });
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', 'Bearer token')
        .send({ itemId: pet._id.toString(), itemType: 'pet', quantity: 3 });

      const response = await request(app)
        .get('/api/cart/all')
        .set('Authorization', 'Bearer token');
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data).toMatchObject({
        totalPrice: 800,
        discountPrice: 140,
      });
    });

    test('recalculates current prices on read and empty resets only content pricing', async () => {
      const product = await createReferencedItem(ProductModel, 'repriced', {
        price: 100,
        discountPercentage: 10,
      });
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', 'Bearer token')
        .send({
          itemId: product._id.toString(),
          itemType: 'product',
          quantity: 2,
        });
      await ProductModel.collection.updateOne(
        { _id: product._id },
        { $set: { price: 150, discountPercentage: 20 } },
      );
      await UserModel.updateOne(
        { _id: testUser._id },
        { $set: { 'cart.shippingPrice': 50 } },
      );

      const refreshed = await request(app)
        .get('/api/cart/all')
        .set('Authorization', 'Bearer token');
      expect(refreshed.body.data).toMatchObject({
        totalPrice: 300,
        discountPrice: 60,
        shippingPrice: 50,
      });

      const emptied = await request(app)
        .delete('/api/cart/empty')
        .set('Authorization', 'Bearer token');
      expect(emptied.body.data).toMatchObject({
        items: [],
        totalPrice: 0,
        discountPrice: 0,
        shippingPrice: 50,
      });
      const secondEmpty = await request(app)
        .delete('/api/cart/empty')
        .set('Authorization', 'Bearer token');
      expect(secondEmpty.status).toBe(STATUES.SUCCESS);
    });

    test.each([
      ['post', '/api/cart/add'],
      ['delete', '/api/cart/empty'],
    ])('rejects unauthenticated %s %s requests', async (method, path) => {
      global.__TEST_UNAUTHENTICATED__ = true;
      const response = await request(app)[method](path).send({});
      expect(response.status).toBe(STATUES.UN_AUTHORIZED);
    });

    test('rejects invalid cart type and nonexistent referenced items', async () => {
      const itemId = new mongoose.Types.ObjectId().toString();
      const invalidType = await request(app)
        .post('/api/cart/add')
        .set('Authorization', 'Bearer token')
        .send({ itemId, itemType: 'order', quantity: 1 });
      expect(invalidType.status).toBe(STATUES.BAD_FORM_VALIDATION);
      for (const itemType of ['product', 'pet']) {
        const missingItem = await request(app)
          .post('/api/cart/add')
          .set('Authorization', 'Bearer token')
          .send({ itemId, itemType, quantity: 1 });
        expect(missingItem.status).toBe(STATUES.NOT_FOUND);
      }
    });

    test('keeps cart and wishlist data isolated to the authenticated user', async () => {
      const otherUser = await createTestUser({ phoneNumber: '09111111111' });
      await UserModel.findByIdAndUpdate(otherUser._id, {
        $push: {
          'cart.items': {
            item: new mongoose.Types.ObjectId(),
            itemType: 'pet',
            quantity: 2,
          },
          wishlist: { item: new mongoose.Types.ObjectId(), itemType: 'pet' },
        },
      });
      const [cartResponse, wishlistResponse] = await Promise.all([
        request(app).get('/api/cart/all').set('Authorization', 'Bearer token'),
        request(app)
          .get('/api/wishlist/all')
          .set('Authorization', 'Bearer token'),
      ]);
      expect(cartResponse.body.data.items).toHaveLength(0);
      expect(wishlistResponse.body.data).toHaveLength(0);
    });

    test('adds each wishlist type once and deletes by embedded entry id', async () => {
      for (const [itemType, Model] of [
        ['product', ProductModel],
        ['pet', PetModel],
      ]) {
        const referenced = await createReferencedItem(
          Model,
          `${itemType}-wishlist`,
        );
        const body = { itemId: referenced._id.toString(), itemType };
        const created = await request(app)
          .post('/api/wishlist/add')
          .set('Authorization', 'Bearer token')
          .send(body);
        expect(created.status).toBe(STATUES.CREATED);
        const duplicate = await request(app)
          .post('/api/wishlist/add')
          .set('Authorization', 'Bearer token')
          .send(body);
        expect(duplicate.status).toBe(STATUES.BAD_FORM_VALIDATION);
      }

      const listed = await request(app)
        .get('/api/wishlist/all')
        .set('Authorization', 'Bearer token');
      expect(listed.body.data).toHaveLength(2);
      expect(listed.body.data[0].item.title).toBeDefined();

      const deleted = await request(app)
        .delete(`/api/wishlist/delete/${listed.body.data[0]._id}`)
        .set('Authorization', 'Bearer token');
      expect(deleted.status).toBe(STATUES.SUCCESS);
      expect(deleted.body.data).toHaveLength(1);
    });

    test('returns not found for unknown embedded cart and wishlist ids', async () => {
      const id = new mongoose.Types.ObjectId();
      const [cartResponse, wishlistResponse] = await Promise.all([
        request(app)
          .delete(`/api/cart/delete/${id}`)
          .set('Authorization', 'Bearer token'),
        request(app)
          .delete(`/api/wishlist/delete/${id}`)
          .set('Authorization', 'Bearer token'),
      ]);
      expect(cartResponse.status).toBe(STATUES.NOT_FOUND);
      expect(wishlistResponse.status).toBe(STATUES.NOT_FOUND);
    });
  });
});
