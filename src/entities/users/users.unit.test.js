jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 'request-id'),
}));

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  decode: jest.fn(),
}));

jest.mock('sharp', () =>
  jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 320,
      height: 240,
      format: 'webp',
    }),
  })),
);

jest.mock('#utils/image.helpers.js', () => ({
  formatImageFile: jest.fn(),
}));

jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    createObjectKey: jest.fn(),
    uploadObject: jest.fn(),
    deleteObject: jest.fn(),
    buildPublicUrl: jest.fn(),
    getObjectKeyFromUrl: jest.fn(),
  },
}));

jest.mock('#configs/logger.js', () => ({
  __esModule: true,
  default: { app: { error: jest.fn() } },
}));

jest.mock('#entities/products/products.service.js', () => ({
  ProductService: { findById: jest.fn(), findCustomerById: jest.fn() },
}));

jest.mock('#entities/pets/pets.service.js', () => ({
  PetService: { findById: jest.fn(), findCustomerById: jest.fn() },
}));

jest.mock('../../integrations/otpCode/otpCode.service.js', () => ({
  OtpCodeService: { send: jest.fn() },
}));

jest.mock('../../infrastructure/redis/otp/redisOtp.store.js', () => {
  const find = jest.fn();
  const releaseReservation = jest.fn();
  const reserve = jest.fn();
  const save = jest.fn();

  return {
    __mockRedisOtpFind: find,
    __mockRedisOtpReleaseReservation: releaseReservation,
    __mockRedisOtpReserve: reserve,
    __mockRedisOtpSave: save,
    createUserOtpKey: jest.fn(
      ({ phoneNumber, ip }) => `otp:users:${phoneNumber}:${ip}`,
    ),
    RedisOtpStore: jest.fn(() => ({ find, releaseReservation, reserve, save })),
  };
});

jest.mock('#utils/helpers.js', () => ({
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

  getPaginationData: jest.fn(),

  verifyRefreshToken: jest.fn(),
}));

jest.mock('./users.model.js', () => ({
  UserModel: {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { ERROR_CODES, ROLES, STATUES, USER_OTP } from '#configs/constants.js';
import logger from '#configs/logger.js';
import { PetService } from '#entities/pets/pets.service.js';
import { ProductService } from '#entities/products/products.service.js';
import { ObjectStorageService } from '#services/objectStorage.service.js';
import { getPaginationData, verifyRefreshToken } from '#utils/helpers.js';
import { formatImageFile } from '#utils/image.helpers.js';

import { OtpCodeService } from '../../integrations/otpCode/otpCode.service.js';
import {
  __mockRedisOtpFind as mockRedisOtpFind,
  __mockRedisOtpReleaseReservation as mockRedisOtpReleaseReservation,
  __mockRedisOtpReserve as mockRedisOtpReserve,
  __mockRedisOtpSave as mockRedisOtpSave,
  createUserOtpKey,
} from '../../infrastructure/redis/otp/redisOtp.store.js';
import { UserModel } from './users.model.js';

import { UserService } from './users.service.js';

describe('UserService - Unit Tests', () => {
  let mockUser;
  let mockActor;

  beforeEach(() => {
    mockUser = {
      _id: '65a4de97aff1fbb38c437952',

      firstName: 'Mahdi',
      lastName: 'Rashidi',

      phoneNumber: '09123456789',

      password: 'hashed-password',

      role: ROLES.CUSTOMER,

      isEnable: true,

      nationalCode: '1234567890',

      addresses: [],

      age: 25,

      cart: {
        totalPrice: 200,
        discountPrice: 20,
        items: [
          {
            item: {
              _id: '65a4de97aff1fbb38c437950',
              price: 100,
              discountPercentage: 10,
            },
            itemType: 'product',
            quantity: 2,
          },
        ],
      },

      wishlist: [],

      orders: [],
    };

    mockActor = {
      userId: mockUser._id,
      role: ROLES.CUSTOMER,
    };

    jest.clearAllMocks();
    mockRedisOtpReserve.mockResolvedValue({
      acquired: true,
      remainingSeconds: USER_OTP.RESERVATION_TTL_SECONDS,
    });
    mockRedisOtpFind.mockResolvedValue(null);
    mockRedisOtpReleaseReservation.mockResolvedValue(true);
  });

  // =========================================================
  // FIND ONE
  // =========================================================

  test('findOne returns user if exists', async () => {
    UserModel.findOne.mockResolvedValue(mockUser);

    const result = await UserService.findOne({
      phoneNumber: mockUser.phoneNumber,
    });

    expect(result).toEqual(mockUser);

    expect(UserModel.findOne).toHaveBeenCalledWith({
      phoneNumber: mockUser.phoneNumber,
    });
  });

  test('findOne returns null if user does not exist', async () => {
    UserModel.findOne.mockResolvedValue(null);

    const result = await UserService.findOne({
      phoneNumber: '09999999999',
    });

    expect(result).toBeNull();
  });

  // =========================================================
  // FIND BY ID
  // =========================================================

  test('findById returns user', async () => {
    UserModel.findById.mockResolvedValue(mockUser);

    const result = await UserService.findById(mockUser._id);

    expect(result).toEqual(mockUser);

    expect(UserModel.findById).toHaveBeenCalledWith(mockUser._id);
  });

  test('findById throws if id is missing', async () => {
    await expect(UserService.findById()).rejects.toThrow('ورودی معتبر نیست');
  });

  test('findById throws if user does not exist', async () => {
    UserModel.findById.mockResolvedValue(null);

    await expect(UserService.findById(mockUser._id)).rejects.toThrow(
      'کاربری با این مشخصات یافت نشد',
    );
  });

  test('findById returns null when throwOnNotFound is false', async () => {
    UserModel.findById.mockResolvedValue(null);

    const result = await UserService.findById(mockUser._id, false);

    expect(result).toBeNull();
  });

  // =========================================================
  // PASSWORD
  // =========================================================

  test('hashPassword hashes password', async () => {
    bcrypt.genSalt.mockResolvedValue('salt');

    bcrypt.hash.mockResolvedValue('hashed-password');

    const result = await UserService.hashPassword('password123');

    expect(result).toBe('hashed-password');

    expect(bcrypt.genSalt).toHaveBeenCalledWith(12);

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
  });

  test('comparePassword returns true for correct password', async () => {
    bcrypt.compare.mockResolvedValue(true);

    const result = await UserService.comparePassword(
      'hashed-password',
      'password123',
    );

    expect(result).toBe(true);

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'password123',
      'hashed-password',
    );
  });

  test('comparePassword returns false for incorrect password', async () => {
    bcrypt.compare.mockResolvedValue(false);

    const result = await UserService.comparePassword(
      'hashed-password',
      'wrong-password',
    );

    expect(result).toBe(false);
  });

  // =========================================================
  // TOKENS
  // =========================================================

  test('createAccessToken creates access token', () => {
    jwt.sign.mockReturnValue('access-token');

    const result = UserService.createAccessToken(
      mockUser._id,
      mockUser.phoneNumber,
      mockUser.role,
      '7h',
    );

    expect(result).toBe('access-token');

    expect(jwt.sign).toHaveBeenCalledWith(
      {
        userId: mockUser._id,
        username: mockUser.phoneNumber,
        role: mockUser.role,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: '7h',
      },
    );
  });

  test('createRefreshToken creates refresh token', () => {
    jwt.sign.mockReturnValue('refresh-token');

    const result = UserService.createRefreshToken(mockUser._id);

    expect(result).toBe('refresh-token');

    expect(jwt.sign).toHaveBeenCalledWith(
      {
        userId: mockUser._id,
      },
      process.env.JWT_REFRESH_SECRET_KEY,
      {
        expiresIn: '7d',
      },
    );
  });

  // =========================================================
  // CREATE
  // =========================================================

  test('create creates new user', async () => {
    const data = {
      firstName: 'Mahdi',
      lastName: 'Rashidi',
      phoneNumber: '09123456789',
      password: 'password123',
    };

    UserModel.findOne.mockResolvedValue(null);

    bcrypt.genSalt.mockResolvedValue('salt');

    bcrypt.hash.mockResolvedValue('hashed-password');

    UserModel.create.mockResolvedValue({
      ...data,
      _id: mockUser._id,
      password: 'hashed-password',
    });

    const result = await UserService.create(data);

    expect(result.phoneNumber).toBe(data.phoneNumber);

    expect(UserModel.findOne).toHaveBeenCalledWith({
      phoneNumber: data.phoneNumber,
    });

    expect(UserModel.create).toHaveBeenCalledWith({
      ...data,
      password: 'hashed-password',
    });
  });

  test('create throws if user already exists', async () => {
    UserModel.findOne.mockResolvedValue(mockUser);

    await expect(
      UserService.create({
        phoneNumber: mockUser.phoneNumber,
        password: 'password123',
      }),
    ).rejects.toThrow('کاربری با این مشخصات وجود دارد');
  });

  // =========================================================
  // SEND OTP
  // =========================================================

  test('sendOtp sends, hashes, and stores a six-digit code for an existing user', async () => {
    UserModel.findOne.mockResolvedValue(mockUser);
    OtpCodeService.send.mockResolvedValue({ code: '123456', status: '' });
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed-code');
    mockRedisOtpSave.mockResolvedValue(119);

    await expect(
      UserService.sendOtp({
        phoneNumber: mockUser.phoneNumber,
        ip: '127.0.0.1',
      }),
    ).resolves.toEqual({ remainingSeconds: 119, sent: true });
    expect(UserModel.findOne).toHaveBeenCalledWith({
      phoneNumber: mockUser.phoneNumber,
    });
    expect(OtpCodeService.send).toHaveBeenCalledWith({
      to: mockUser.phoneNumber,
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 'salt');
    expect(createUserOtpKey).toHaveBeenCalledWith({
      phoneNumber: mockUser.phoneNumber,
      ip: '127.0.0.1',
    });
    expect(mockRedisOtpReserve).toHaveBeenCalledWith({
      key: `otp:users:${mockUser.phoneNumber}:127.0.0.1`,
      reservationId: 'pending:request-id',
      ttlSeconds: USER_OTP.RESERVATION_TTL_SECONDS,
    });
    expect(mockRedisOtpSave).toHaveBeenCalledWith({
      key: `otp:users:${mockUser.phoneNumber}:127.0.0.1`,
      reservationId: 'pending:request-id',
      hashedCode: 'hashed-code',
      ttlSeconds: USER_OTP.TTL_SECONDS,
    });
    expect(mockRedisOtpReleaseReservation).not.toHaveBeenCalled();
  });

  test('sendOtp returns the active reservation TTL without requesting or hashing another code', async () => {
    UserModel.findOne.mockResolvedValue(mockUser);
    mockRedisOtpReserve.mockResolvedValue({
      acquired: false,
      remainingSeconds: 73,
    });

    await expect(
      UserService.sendOtp({
        phoneNumber: mockUser.phoneNumber,
        ip: '127.0.0.1',
      }),
    ).resolves.toEqual({ remainingSeconds: 73, sent: false });
    expect(OtpCodeService.send).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(mockRedisOtpSave).not.toHaveBeenCalled();
    expect(mockRedisOtpReleaseReservation).not.toHaveBeenCalled();
  });

  test('sendOtp rejects an unknown phone number before requesting a code', async () => {
    UserModel.findOne.mockResolvedValue(null);

    await expect(
      UserService.sendOtp({ phoneNumber: '09999999999', ip: '127.0.0.1' }),
    ).rejects.toMatchObject({
      statusCode: STATUES.NOT_FOUND,
      message: 'کاربری با این شماره تلفن یافت نشد',
    });
    expect(OtpCodeService.send).not.toHaveBeenCalled();
    expect(mockRedisOtpReserve).not.toHaveBeenCalled();
    expect(mockRedisOtpSave).not.toHaveBeenCalled();
  });

  test.each(['12345', '1234567', 'abcdef'])(
    'sendOtp rejects invalid provider code %s without storing it',
    async (code) => {
      UserModel.findOne.mockResolvedValue(mockUser);
      OtpCodeService.send.mockResolvedValue({ code, status: '' });

      await expect(
        UserService.sendOtp({
          phoneNumber: mockUser.phoneNumber,
          ip: '127.0.0.1',
        }),
      ).rejects.toMatchObject({
        statusCode: STATUES.OTHER_PROBLEM,
        code: ERROR_CODES.INVALID_MELIPAYAMAK_PROVIDER_RESPONSE,
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockRedisOtpSave).not.toHaveBeenCalled();
      expect(mockRedisOtpReleaseReservation).toHaveBeenCalledWith({
        key: `otp:users:${mockUser.phoneNumber}:127.0.0.1`,
        reservationId: 'pending:request-id',
      });
    },
  );

  test('sendOtp releases its reservation and preserves a provider failure', async () => {
    const providerError = new Error('provider rejected');
    UserModel.findOne.mockResolvedValue(mockUser);
    OtpCodeService.send.mockRejectedValue(providerError);

    await expect(
      UserService.sendOtp({
        phoneNumber: mockUser.phoneNumber,
        ip: '127.0.0.1',
      }),
    ).rejects.toBe(providerError);
    expect(mockRedisOtpReleaseReservation).toHaveBeenCalledWith({
      key: `otp:users:${mockUser.phoneNumber}:127.0.0.1`,
      reservationId: 'pending:request-id',
    });
  });

  test('sendOtp preserves the provider failure when reservation cleanup also fails', async () => {
    const providerError = new Error('provider rejected');
    const cleanupError = new Error('redis cleanup failed');
    UserModel.findOne.mockResolvedValue(mockUser);
    OtpCodeService.send.mockRejectedValue(providerError);
    mockRedisOtpReleaseReservation.mockRejectedValue(cleanupError);

    await expect(
      UserService.sendOtp({
        phoneNumber: mockUser.phoneNumber,
        ip: '127.0.0.1',
      }),
    ).rejects.toBe(providerError);
    expect(logger.app.error).toHaveBeenCalledWith(
      'آزادسازی رزرو ناموفق کد تأیید در Redis با خطا مواجه شد',
      cleanupError,
    );
  });

  test('verifyOtp compares the submitted code with the phone-and-IP hash', async () => {
    mockRedisOtpFind.mockResolvedValue({
      hashedCode: 'hashed-code',
      remainingSeconds: 75,
    });
    bcrypt.compare.mockResolvedValue(true);

    await expect(
      UserService.verifyOtp({
        phoneNumber: mockUser.phoneNumber,
        otpCode: '123456',
        ip: '127.0.0.1',
      }),
    ).resolves.toBe(true);
    expect(mockRedisOtpFind).toHaveBeenCalledWith(
      `otp:users:${mockUser.phoneNumber}:127.0.0.1`,
    );
    expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'hashed-code');
  });

  test('verifyOtp asks the caller to resend when the OTP expired', async () => {
    await expect(
      UserService.verifyOtp({
        phoneNumber: mockUser.phoneNumber,
        otpCode: '123456',
        ip: '127.0.0.1',
      }),
    ).rejects.toMatchObject({
      statusCode: STATUES.BAD_FORM_VALIDATION,
      message:
        'کد تأیید منقضی شده است؛ لطفاً کد را دوباره ارسال کرده و سپس تلاش کنید',
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  test('verifyOtp rejects an incorrect code', async () => {
    mockRedisOtpFind.mockResolvedValue({
      hashedCode: 'hashed-code',
      remainingSeconds: 75,
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      UserService.verifyOtp({
        phoneNumber: mockUser.phoneNumber,
        otpCode: '654321',
        ip: '127.0.0.1',
      }),
    ).rejects.toMatchObject({
      statusCode: STATUES.BAD_FORM_VALIDATION,
      message: 'کد تأیید وارد شده معتبر نیست',
    });
  });

  test('register creates a customer account with a hashed password', async () => {
    const credentials = {
      phoneNumber: '09111111111',
      password: 'password123',
    };
    UserModel.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed-password');
    UserModel.create.mockResolvedValue({
      ...credentials,
      password: 'hashed-password',
      role: ROLES.CUSTOMER,
    });

    await UserService.register(credentials);

    expect(UserModel.create).toHaveBeenCalledWith({
      phoneNumber: credentials.phoneNumber,
      password: 'hashed-password',
      role: ROLES.CUSTOMER,
    });
  });

  test('register rejects an existing phone number', async () => {
    UserModel.findOne.mockResolvedValue(mockUser);

    await expect(
      UserService.register({
        phoneNumber: mockUser.phoneNumber,
        password: 'password123',
      }),
    ).rejects.toThrow('کاربری با این مشخصات وجود دارد');
    expect(UserModel.create).not.toHaveBeenCalled();
  });

  // =========================================================
  // LOGIN
  // =========================================================

  test('login returns user and tokens', async () => {
    const accessExp = 1_800_000_000_000;
    const sessionExp = 1_800_604_800_000;

    UserModel.findOne.mockResolvedValue(mockUser);

    bcrypt.compare.mockResolvedValue(true);

    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    jwt.decode
      .mockReturnValueOnce({ exp: accessExp / 1000 })
      .mockReturnValueOnce({ exp: sessionExp / 1000 });

    const result = await UserService.login({
      phoneNumber: mockUser.phoneNumber,
      password: 'password123',
    });

    expect(result).toEqual({
      user: mockUser,
      userId: mockUser._id,
      role: mockUser.role,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessExp,
      sessionExp,
    });
    expect(jwt.decode).toHaveBeenNthCalledWith(1, 'access-token');
    expect(jwt.decode).toHaveBeenNthCalledWith(2, 'refresh-token');
  });

  test('login throws if user does not exist', async () => {
    UserModel.findOne.mockResolvedValue(null);

    await expect(
      UserService.login({
        phoneNumber: '09999999999',
        password: 'password123',
      }),
    ).rejects.toThrow('کاربری با این مشخصات یافت نشد');
  });

  test('login throws if password is incorrect', async () => {
    UserModel.findOne.mockResolvedValue(mockUser);

    bcrypt.compare.mockResolvedValue(false);

    await expect(
      UserService.login({
        phoneNumber: mockUser.phoneNumber,
        password: 'wrong-password',
      }),
    ).rejects.toThrow('کاربری با این مشخصات یافت نشد');
  });

  // =========================================================
  // REFRESH TOKEN
  // =========================================================

  test('refreshAccessToken returns new access token', async () => {
    UserModel.findById.mockResolvedValue(mockUser);

    jwt.sign.mockReturnValue('new-access-token');

    verifyRefreshToken.mockImplementation((token, callback) => {
      callback({
        userId: mockUser._id,
      });
    });

    const result = await UserService.refreshAccessToken('refresh-token');

    expect(result).toBe('new-access-token');

    expect(verifyRefreshToken).toHaveBeenCalledWith(
      'refresh-token',
      expect.any(Function),
    );
  });

  test('refreshAccessToken throws if token is missing', async () => {
    await expect(UserService.refreshAccessToken(undefined)).rejects.toThrow(
      'توکن نامعتبر است',
    );
  });

  // =========================================================
  // UPDATE
  // =========================================================

  test('update updates user', async () => {
    const updatedUser = {
      ...mockUser,
      firstName: 'Ali',
    };

    UserModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

    const result = await UserService.update(mockUser._id, {
      userId: mockUser._id,
      firstName: 'Ali',
    });

    expect(result.firstName).toBe('Ali');

    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockUser._id,
      {
        $set: {
          firstName: 'Ali',
        },
      },
      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  });

  test('update removes userId from update fields', async () => {
    UserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

    await UserService.update(mockUser._id, {
      userId: mockUser._id,
      firstName: 'Mahdi',
    });

    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockUser._id,
      {
        $set: {
          firstName: 'Mahdi',
        },
      },
      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  });

  test('update throws if id is missing', async () => {
    await expect(
      UserService.update(undefined, {
        firstName: 'Ali',
      }),
    ).rejects.toThrow('ورودی معتبر نیست');
  });

  test('update throws if user does not exist', async () => {
    UserModel.findByIdAndUpdate.mockResolvedValue(null);

    await expect(
      UserService.update(mockUser._id, {
        firstName: 'Ali',
      }),
    ).rejects.toThrow('کاربری یافت نشد');
  });

  test('updatePersonalInfo processes, uploads, and persists an avatar', async () => {
    const avatarFile = { buffer: Buffer.from('source-image') };
    const formattedImage = Buffer.from('formatted-image');
    const avatarUrl = 'https://cdn.test/users/id/avatar/new.webp';

    UserModel.findById.mockResolvedValue(mockUser);
    UserModel.findByIdAndUpdate.mockResolvedValue({
      ...mockUser,
      firstName: 'Ali',
      avatar: avatarUrl,
    });
    formatImageFile.mockResolvedValue(formattedImage);
    ObjectStorageService.createObjectKey.mockReturnValue(
      'users/id/avatar/new.webp',
    );
    ObjectStorageService.uploadObject.mockResolvedValue(
      'users/id/avatar/new.webp',
    );
    ObjectStorageService.buildPublicUrl.mockReturnValue(avatarUrl);

    const result = await UserService.updatePersonalInfo(
      mockActor,
      { firstName: 'Ali' },
      avatarFile,
    );

    expect(result.avatar).toBe(avatarUrl);
    expect(formatImageFile).toHaveBeenCalledWith(avatarFile.buffer, 'webp');
    expect(ObjectStorageService.uploadObject).toHaveBeenCalledWith({
      key: 'users/id/avatar/new.webp',
      body: formattedImage,
      contentType: 'image/webp',
    });
    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockUser._id,
      { $set: { firstName: 'Ali', avatar: avatarUrl } },
      { returnDocument: 'after', runValidators: true },
    );
  });

  test('updatePersonalInfo rejects an empty update', async () => {
    await expect(UserService.updatePersonalInfo(mockActor, {})).rejects.toThrow(
      'حداقل یک فیلد پروفایل یا تصویر آواتار باید ارسال شود',
    );

    expect(UserModel.findById).not.toHaveBeenCalled();
  });

  test('updatePersonalInfo rejects invalid image bytes before upload', async () => {
    formatImageFile.mockRejectedValue(new Error('invalid image'));

    await expect(
      UserService.updatePersonalInfo(
        mockActor,
        {},
        {
          buffer: Buffer.from('invalid-image'),
        },
      ),
    ).rejects.toThrow('تصویر آواتار ارسال‌شده معتبر نیست');

    expect(ObjectStorageService.uploadObject).not.toHaveBeenCalled();
  });

  test('updatePersonalInfo rolls back a new avatar when persistence fails', async () => {
    UserModel.findById.mockResolvedValue(mockUser);
    UserModel.findByIdAndUpdate.mockRejectedValue(new Error('database failed'));
    formatImageFile.mockResolvedValue(Buffer.from('formatted-image'));
    ObjectStorageService.createObjectKey.mockReturnValue('new-avatar.webp');
    ObjectStorageService.uploadObject.mockResolvedValue('new-avatar.webp');
    ObjectStorageService.buildPublicUrl.mockReturnValue(
      'https://cdn.test/new-avatar.webp',
    );
    ObjectStorageService.deleteObject.mockResolvedValue();

    await expect(
      UserService.updatePersonalInfo(
        mockActor,
        {},
        {
          buffer: Buffer.from('source-image'),
        },
      ),
    ).rejects.toThrow('database failed');

    expect(ObjectStorageService.deleteObject).toHaveBeenCalledWith(
      'new-avatar.webp',
    );
  });

  test('updatePersonalInfo replaces the previous avatar after persistence', async () => {
    const userWithAvatar = {
      ...mockUser,
      avatar: 'https://cdn.test/old-avatar.webp',
    };
    UserModel.findById.mockResolvedValue(userWithAvatar);
    UserModel.findByIdAndUpdate.mockResolvedValue(userWithAvatar);
    formatImageFile.mockResolvedValue(Buffer.from('formatted-image'));
    ObjectStorageService.createObjectKey.mockReturnValue('new-avatar.webp');
    ObjectStorageService.uploadObject.mockResolvedValue('new-avatar.webp');
    ObjectStorageService.buildPublicUrl.mockReturnValue(
      'https://cdn.test/new-avatar.webp',
    );
    ObjectStorageService.getObjectKeyFromUrl.mockReturnValue('old-avatar.webp');
    ObjectStorageService.deleteObject.mockResolvedValue();

    await UserService.updatePersonalInfo(
      mockActor,
      {},
      {
        buffer: Buffer.from('source-image'),
      },
    );

    expect(ObjectStorageService.deleteObject).toHaveBeenCalledWith(
      'old-avatar.webp',
    );
  });

  test('resolveProfileTargetUserId lets an admin target another user', () => {
    const targetUserId = '65a4de97aff1fbb38c437999';

    expect(
      UserService.resolveProfileTargetUserId(
        { ...mockActor, role: ROLES.ADMIN },
        targetUserId,
      ),
    ).toBe(targetUserId);
  });

  test('resolveProfileTargetUserId prevents a customer editing another user', () => {
    expect(() =>
      UserService.resolveProfileTargetUserId(
        mockActor,
        '65a4de97aff1fbb38c437999',
      ),
    ).toThrow('شما اجازه ویرایش اطلاعات کاربر دیگری را ندارید');
  });

  test('format preserves the saved avatar URL and removes the password', () => {
    const result = UserService.format({
      ...mockUser,
      avatar: 'https://cdn.test/avatar.webp',
    });

    expect(result.password).toBeUndefined();
    expect(result.avatar).toBe('https://cdn.test/avatar.webp');
  });

  // =========================================================
  // ENABLE / DISABLE
  // =========================================================

  test('disable sets isEnable false', async () => {
    UserModel.findByIdAndUpdate.mockResolvedValue({
      ...mockUser,
      isEnable: false,
    });

    const result = await UserService.disable(mockUser._id);

    expect(result.isEnable).toBe(false);

    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockUser._id,
      {
        $set: {
          isEnable: false,
        },
      },
      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  });

  test('enable sets isEnable true', async () => {
    UserModel.findByIdAndUpdate.mockResolvedValue({
      ...mockUser,
      isEnable: true,
    });

    const result = await UserService.enable(mockUser._id);

    expect(result.isEnable).toBe(true);
  });

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  test('changePassword changes password', async () => {
    UserModel.findById.mockResolvedValue(mockUser);

    bcrypt.compare.mockResolvedValue(true);

    bcrypt.genSalt.mockResolvedValue('salt');

    bcrypt.hash.mockResolvedValue('new-hashed-password');

    UserModel.updateOne.mockResolvedValue({
      acknowledged: true,
    });

    const result = await UserService.changePassword({
      userId: mockUser._id,
      oldPassword: 'password123',
      password: 'newPassword123',
      repeatPassword: 'newPassword123',
    });

    expect(result).toEqual(mockUser);

    expect(UserModel.updateOne).toHaveBeenCalledWith(
      {
        _id: mockUser._id,
      },
      {
        $set: {
          password: 'new-hashed-password',
        },
      },
    );
  });

  test('changePassword throws if old password is incorrect', async () => {
    UserModel.findById.mockResolvedValue(mockUser);

    bcrypt.compare.mockResolvedValue(false);

    await expect(
      UserService.changePassword({
        userId: mockUser._id,
        oldPassword: 'wrong-password',
        password: 'newPassword123',
      }),
    ).rejects.toThrow('کلمه عبور قبلی صحیح نیست');
  });

  // =========================================================
  // FULL NAME
  // =========================================================

  test('getFullName returns first and last name', () => {
    expect(UserService.getFullName(mockUser)).toBe('Mahdi Rashidi');
  });

  test('getFullName returns first name only', () => {
    expect(
      UserService.getFullName({
        firstName: 'Mahdi',
      }),
    ).toBe('Mahdi');
  });

  test('getFullName returns default name', () => {
    expect(UserService.getFullName({})).toBe('کاربر');
  });

  // =========================================================
  // FILTERS
  // =========================================================

  test('buildAllUsersFilter filters by single fullName', () => {
    const result = UserService.buildAllUsersFilter({
      fullName: 'Mahdi',
    });

    expect(result).toEqual({
      $or: [
        {
          firstName: {
            $regex: 'Mahdi',
            $options: 'i',
          },
        },
        {
          lastName: {
            $regex: 'Mahdi',
            $options: 'i',
          },
        },
      ],
    });
  });

  test('buildAllUsersFilter filters by full first and last name', () => {
    const result = UserService.buildAllUsersFilter({
      fullName: 'Mahdi Rashidi',
    });

    expect(result).toEqual({
      firstName: {
        $regex: 'Mahdi',
        $options: 'i',
      },
      lastName: {
        $regex: 'Rashidi',
        $options: 'i',
      },
    });
  });

  test('buildAllUsersFilter adds other filters', () => {
    const result = UserService.buildAllUsersFilter({
      role: ROLES.CUSTOMER,
      phoneNumber: '09123456789',
    });

    expect(result).toEqual({
      role: {
        $regex: 'customer',
        $options: 'i',
      },

      phoneNumber: {
        $regex: '09123456789',
        $options: 'i',
      },
    });
  });

  test('buildPaginatedUsersFilter keeps page limit and sort', () => {
    const result = UserService.buildPaginatedUsersFilter({
      page: 2,
      limit: 20,
      sort: '-createdAt',
      role: ROLES.CUSTOMER,
    });

    expect(result).toEqual({
      page: 2,
      limit: 20,
      sort: '-createdAt',

      role: {
        $regex: 'customer',
        $options: 'i',
      },
    });
  });

  // =========================================================
  // FIND ALL
  // =========================================================

  test('findAll returns all matched users', async () => {
    UserModel.find.mockResolvedValue([mockUser]);

    const result = await UserService.findAll({});

    expect(result).toEqual([mockUser]);

    expect(UserModel.find).toHaveBeenCalledWith({});
  });

  // =========================================================
  // PAGINATION
  // =========================================================

  test('findAllPaginated returns pagination result', async () => {
    getPaginationData.mockResolvedValue({
      data: [mockUser],
      totalRecords: 1,
    });

    const result = await UserService.findAllPaginated({
      page: 1,
      limit: 10,
    });

    expect(result).toEqual({
      data: [mockUser],
      totalRecords: 1,
    });

    expect(getPaginationData).toHaveBeenCalledWith(
      UserModel,
      {
        page: 1,
        limit: 10,
      },
      '-password',
      expect.any(Function),
    );
  });

  describe('address management', () => {
    const address = {
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
    };

    test('addAddress uses an atomic maximum-length condition', async () => {
      const createdAddress = { ...address, _id: 'address-id' };
      UserModel.findById.mockResolvedValue(mockUser);
      UserModel.findOneAndUpdate.mockResolvedValue({
        addresses: [createdAddress],
      });

      await expect(UserService.addAddress(mockActor, address)).resolves.toEqual(
        createdAddress,
      );
      expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockUser._id, 'addresses.4': { $exists: false } },
        { $push: { addresses: expect.objectContaining(address) } },
        { returnDocument: 'after', runValidators: true },
      );
    });

    test('addAddress maps a failed atomic condition to the address limit', async () => {
      UserModel.findById.mockResolvedValue(mockUser);
      UserModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(UserService.addAddress(mockActor, address)).rejects.toThrow(
        'حداکثر 5 نشانی قابل ثبت است',
      );
    });

    test('resolveAddressReceiver snapshots the current user', () => {
      expect(
        UserService.resolveAddressReceiver(mockUser, {
          ...address,
          receiverIsMe: true,
        }),
      ).toMatchObject({
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        nationalCode: mockUser.nationalCode,
        phoneNumber: mockUser.phoneNumber,
      });
    });

    test('editAddress persists a validated partial final state by subdocument id', async () => {
      const addressId = '65a4de97aff1fbb38c437951';
      const existing = {
        ...address,
        _id: addressId,
        toObject: jest.fn(() => ({ ...address, _id: addressId })),
      };
      const updated = { ...address, _id: addressId, plate: '25' };
      mockUser.addresses = { id: jest.fn(() => existing) };
      UserModel.findById.mockResolvedValue(mockUser);
      UserModel.findOneAndUpdate.mockResolvedValue({
        addresses: { id: jest.fn(() => updated) },
      });

      await expect(
        UserService.editAddress(mockActor, addressId, { plate: '25' }),
      ).resolves.toEqual(updated);
      expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockUser._id, 'addresses._id': addressId },
        {
          $set: {
            'addresses.$': expect.objectContaining({
              _id: addressId,
              plate: '25',
              city: address.city,
            }),
          },
        },
        { returnDocument: 'after', runValidators: true },
      );
    });

    test('editAddress hides addresses owned by another user as not found', async () => {
      mockUser.addresses = { id: jest.fn(() => null) };
      UserModel.findById.mockResolvedValue(mockUser);

      await expect(
        UserService.editAddress(mockActor, '65a4de97aff1fbb38c437951', {
          plate: '25',
        }),
      ).rejects.toThrow('نشانی یافت نشد');
      expect(UserModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test('getAddresses returns only the authenticated user addresses', async () => {
      mockUser.addresses = [address];
      UserModel.findById.mockResolvedValue(mockUser);

      await expect(UserService.getAddresses(mockActor)).resolves.toEqual([
        address,
      ]);
    });
  });

  // =========================================================
  // CART
  // =========================================================

  test('addCartItem validates a product, increments quantity, and recalculates pricing', async () => {
    const data = {
      itemId: mockUser.cart.items[0].item._id,
      itemType: 'product',
      quantity: 3,
    };
    const recalculatedUser = {
      ...mockUser,
      cart: {
        ...mockUser.cart,
        items: [{ ...mockUser.cart.items[0], quantity: 5 }],
      },
    };
    ProductService.findCustomerById.mockResolvedValue({ _id: data.itemId });
    UserModel.findOneAndUpdate.mockResolvedValue(recalculatedUser);
    UserModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(recalculatedUser),
    });
    UserModel.updateOne.mockResolvedValue({ acknowledged: true });

    await expect(
      UserService.addCartItem(mockActor, data),
    ).resolves.toMatchObject({
      totalPrice: 500,
      discountPrice: 50,
    });
    expect(ProductService.findCustomerById).toHaveBeenCalledWith(data.itemId);
    expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: mockActor.userId }),
      { $inc: { 'cart.items.$.quantity': 3 } },
      expect.any(Object),
    );
    expect(UserModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  test('addCartItem validates a pet and atomically pushes a unique entry', async () => {
    const data = {
      itemId: '65a4de97aff1fbb38c437951',
      itemType: 'pet',
      quantity: 5,
    };
    const petItem = {
      item: { _id: data.itemId, price: 200, discountPercentage: 20 },
      itemType: data.itemType,
      quantity: data.quantity,
    };
    const recalculatedUser = {
      ...mockUser,
      cart: { ...mockUser.cart, items: [petItem] },
    };
    PetService.findCustomerById.mockResolvedValue({ _id: data.itemId });
    UserModel.findOneAndUpdate
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(recalculatedUser);
    UserModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(recalculatedUser),
    });
    UserModel.updateOne.mockResolvedValue({ acknowledged: true });

    await expect(
      UserService.addCartItem(mockActor, data),
    ).resolves.toMatchObject({
      totalPrice: 1000,
      discountPrice: 200,
    });
    expect(PetService.findCustomerById).toHaveBeenCalledWith(data.itemId);
  });

  test('deleteCartItem rejects an entry not owned by the authenticated user', async () => {
    UserModel.findOneAndUpdate.mockResolvedValue(null);
    await expect(
      UserService.deleteCartItem(mockActor, '65a4de97aff1fbb38c437951'),
    ).rejects.toThrow('آیتم سبد خرید یافت نشد');
  });

  test('deleteCartItem recalculates totals after removing an owned entry', async () => {
    const emptyUser = {
      ...mockUser,
      cart: { ...mockUser.cart, items: [] },
    };
    UserModel.findOneAndUpdate.mockResolvedValue(emptyUser);
    UserModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(emptyUser),
    });
    UserModel.updateOne.mockResolvedValue({ acknowledged: true });
    await expect(
      UserService.deleteCartItem(mockActor, '65a4de97aff1fbb38c437951'),
    ).resolves.toMatchObject({
      items: [],
      totalPrice: 0,
      discountPrice: 0,
    });
  });

  test('getCartItems populates only the authenticated user cart', async () => {
    const populate = jest.fn().mockResolvedValue(mockUser);
    UserModel.findById.mockReturnValue({ populate });
    UserModel.updateOne.mockResolvedValue({ acknowledged: true });
    await expect(UserService.getCartItems(mockActor)).resolves.toEqual(
      mockUser.cart,
    );
    expect(UserModel.findById).toHaveBeenCalledWith(mockActor.userId);
    expect(populate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'cart.items.item' }),
    );
  });

  test('emptyCart resets items and calculated prices while preserving metadata', async () => {
    UserModel.findByIdAndUpdate.mockResolvedValue({
      cart: {
        items: [],
        totalPrice: 0,
        discountPrice: 0,
        shippingPrice: 500,
      },
    });
    await expect(UserService.emptyCart(mockActor)).resolves.toMatchObject({
      items: [],
      totalPrice: 0,
      discountPrice: 0,
      shippingPrice: 500,
    });
  });

  test('addWishlistItem prevents duplicate entries atomically', async () => {
    const data = { itemId: '65a4de97aff1fbb38c437951', itemType: 'product' };
    ProductService.findById.mockResolvedValue({ _id: data.itemId });
    UserModel.findOneAndUpdate.mockResolvedValue(null);
    UserModel.findById.mockResolvedValue(mockUser);
    await expect(UserService.addWishlistItem(mockActor, data)).rejects.toThrow(
      'این آیتم قبلاً به لیست علاقه‌مندی‌ها اضافه شده است',
    );
  });

  test('deleteWishlistItem returns the remaining owned entries', async () => {
    UserModel.findOneAndUpdate.mockResolvedValue({ wishlist: [] });
    await expect(
      UserService.deleteWishlistItem(mockActor, '65a4de97aff1fbb38c437951'),
    ).resolves.toEqual([]);
  });

  test('getWishlistItems populates only the authenticated user wishlist', async () => {
    const populate = jest.fn().mockResolvedValue(mockUser);
    UserModel.findById.mockReturnValue({ populate });
    await expect(UserService.getWishlistItems(mockActor)).resolves.toEqual([]);
    expect(populate).toHaveBeenCalledWith('wishlist.item');
  });
});
