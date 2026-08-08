jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

jest.mock('#utils/index.js', () => ({
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

  verifyUser: jest.fn(),
}));

jest.mock('./users.model.js', () => ({
  UserModel: {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { getPaginationData, verifyUser } from '#utils/index.js';

import { UserModel } from './users.model.js';

import { UserService } from './users.service.js';

describe('UserService - Unit Tests', () => {
  let mockUser;

  beforeEach(() => {
    mockUser = {
      _id: '65a4de97aff1fbb38c437952',

      firstName: 'Mahdi',
      lastName: 'Rashidi',

      phoneNumber: '09123456789',

      password: 'hashed-password',

      role: 'customer',

      isEnable: true,

      nationalCode: '1234567890',

      address: 'Tehran address',

      city: 'Tehran',

      province: 'Tehran',

      postalCode: '1234567890',

      age: 25,

      cart: [
        {
          itemId: 'item-1',
          quantity: 2,
        },
      ],

      orders: [],
    };

    jest.clearAllMocks();
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
      process.env.JWT_SECRET_KEY,
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
  // LOGIN
  // =========================================================

  test('login returns user and tokens', async () => {
    UserModel.findOne.mockResolvedValue(mockUser);

    bcrypt.compare.mockResolvedValue(true);

    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const result = await UserService.login({
      phoneNumber: mockUser.phoneNumber,
      password: 'password123',
    });

    expect(result).toEqual({
      user: mockUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
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

    verifyUser.mockImplementation((req, res, token, callback) => {
      callback({
        userId: mockUser._id,
      });
    });

    const result = await UserService.refreshAccessToken(
      {},
      {},
      'refresh-token',
    );

    expect(result).toBe('new-access-token');

    expect(verifyUser).toHaveBeenCalled();
  });

  test('refreshAccessToken throws if token is missing', async () => {
    await expect(
      UserService.refreshAccessToken({}, {}, undefined),
    ).rejects.toThrow('توکن نامعتبر است');
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
      role: 'customer',
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
      role: 'customer',
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

  // =========================================================
  // CART
  // =========================================================

  test('getCart returns user cart', async () => {
    UserModel.findById.mockResolvedValue(mockUser);

    const result = await UserService.getCart(mockUser._id);

    expect(result).toEqual(mockUser.cart);
  });
});
