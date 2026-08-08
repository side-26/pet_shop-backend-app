import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { STATUES } from '#configs/constants.js';

import {
  createNewQueryParam,
  getPaginationData,
  setErrorResponse,
  verifyUser,
} from '#utils/index.js';

import { UserModel } from './users.model.js';

export class UserService {
  // =========================================================
  // FIND USER
  // =========================================================

  static async findOne(filter) {
    return UserModel.findOne(filter);
  }

  static async findById(userId, throwOnNotFound = true) {
    if (!userId) {
      setErrorResponse(STATUES.BAD_REQUEST, {
        message: 'ورودی معتبر نیست',
      });
    }

    const user = await UserModel.findById(userId.toString());

    if (!user && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'کاربری با این مشخصات یافت نشد',
      });
    }

    return user;
  }

  // =========================================================
  // PASSWORD
  // =========================================================

  static async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(12);

      return bcrypt.hash(password, salt);
    } catch {
      setErrorResponse(STATUES.INTERNAL_SERVER, {
        message: 'مشکلی پیش آمده لطفا مجددا تلاش فرمایید',
      });
    }
  }

  static async comparePassword(hashedPassword, rawPassword) {
    return bcrypt.compare(rawPassword, hashedPassword);
  }

  // =========================================================
  // TOKENS
  // =========================================================

  static createAccessToken(userId, phoneNumber, role, expiresIn = '8h') {
    return jwt.sign(
      {
        userId,
        username: phoneNumber,
        role,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn,
      },
    );
  }

  static createRefreshToken(userId, expiresIn = '7d') {
    return jwt.sign(
      {
        userId,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn,
      },
    );
  }

  // =========================================================
  // CREATE USER
  // =========================================================

  static async create(data) {
    const existingUser = await this.findOne({
      phoneNumber: data.phoneNumber,
    });

    if (existingUser) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'کاربری با این مشخصات وجود دارد',
      });
    }

    const hashedPassword = await this.hashPassword(data.password);

    return UserModel.create({
      ...data,
      password: hashedPassword,
    });
  }

  // =========================================================
  // LOGIN
  // =========================================================

  static async login(credentials) {
    const user = await this.findOne({
      phoneNumber: credentials.phoneNumber,
    });

    if (!user) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'کاربری با این مشخصات یافت نشد',
      });
    }

    const isPasswordCorrect = await this.comparePassword(
      user.password,
      credentials.password,
    );

    if (!isPasswordCorrect) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'کاربری با این مشخصات یافت نشد',
      });
    }

    const accessToken = this.createAccessToken(
      user._id,
      user.phoneNumber,
      user.role,
      '7h',
    );

    const refreshToken = this.createRefreshToken(user._id);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  // =========================================================
  // REFRESH TOKEN
  // =========================================================

  static async refreshAccessToken(req, res, refreshToken) {
    if (!refreshToken) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'توکن نامعتبر است',
      });
    }

    return new Promise((resolve, reject) => {
      try {
        verifyUser(req, res, refreshToken, async (decoded) => {
          try {
            /*
             * Refresh token currently contains only userId.
             *
             * Therefore we load the user again rather than
             * assuming phoneNumber and role exist in decoded.
             */
            const user = await this.findById(decoded.userId);

            const accessToken = this.createAccessToken(
              user._id,
              user.phoneNumber,
              user.role,
              '7h',
            );

            resolve(accessToken);
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // =========================================================
  // UPDATE USER
  // =========================================================

  static async update(userId, updateRecord) {
    if (!userId) {
      setErrorResponse(STATUES.BAD_REQUEST, {
        message: 'ورودی معتبر نیست',
      });
    }

    /*
     * userId belongs to request validation and should
     * not become part of the User document.
     */
    const { userId: ignoredUserId, ...data } = updateRecord;

    void ignoredUserId;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: data,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedUser) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'کاربری یافت نشد',
      });
    }

    return updatedUser;
  }

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  static async changePassword(data) {
    const user = await this.findById(data.userId);

    const isOldPasswordCorrect = await this.comparePassword(
      user.password,
      data.oldPassword,
    );

    if (!isOldPasswordCorrect) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'کلمه عبور قبلی صحیح نیست',
      });
    }

    const hashedPassword = await this.hashPassword(data.password);

    await UserModel.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          password: hashedPassword,
        },
      },
    );

    return user;
  }

  // =========================================================
  // ENABLE / DISABLE
  // =========================================================

  static async enable(userId) {
    return this.update(userId, {
      isEnable: true,
    });
  }

  static async disable(userId) {
    return this.update(userId, {
      isEnable: false,
    });
  }

  // =========================================================
  // FULL NAME
  // =========================================================

  static getFullName(
    user,
    firstNameKey = 'firstName',
    lastNameKey = 'lastName',
  ) {
    const firstName = user?.[firstNameKey];

    const lastName = user?.[lastNameKey];

    return firstName || lastName
      ? `${firstName}${lastName ? ` ${lastName}` : ''}`
      : 'کاربر';
  }

  // =========================================================
  // FILTER HELPERS
  // =========================================================

  static buildFullNameFilter(filterParams, query) {
    if (!filterParams.fullName) {
      return;
    }

    const nameParts = filterParams.fullName.trim().split(/\s+/);

    if (nameParts.length === 1) {
      query.$or = [
        {
          firstName: {
            $regex: nameParts[0],
            $options: 'i',
          },
        },
        {
          lastName: {
            $regex: nameParts[0],
            $options: 'i',
          },
        },
      ];
    } else {
      query.firstName = {
        $regex: nameParts[0],
        $options: 'i',
      };

      query.lastName = {
        $regex: nameParts.slice(1).join(' '),
        $options: 'i',
      };
    }

    delete filterParams.fullName;
  }

  static buildAllUsersFilter(queryParams) {
    const filterParams = createNewQueryParam(queryParams, [
      'fullName',
      'role',
      'phoneNumber',
      'nationalCode',
    ]);

    const query = {};

    this.buildFullNameFilter(filterParams, query);

    Object.entries(filterParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      query[key] =
        typeof value === 'string'
          ? {
              $regex: value,
              $options: 'i',
            }
          : value;
    });

    return query;
  }

  static buildPaginatedUsersFilter(queryParams) {
    const filterParams = createNewQueryParam(queryParams, [
      'fullName',
      'role',
      'phoneNumber',
      'nationalCode',
      'page',
      'limit',
      'isEnable',
      'sort',
    ]);

    const query = {};

    this.buildFullNameFilter(filterParams, query);

    const paginationKeys = ['page', 'limit', 'sort'];

    Object.entries(filterParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      if (paginationKeys.includes(key)) {
        query[key] = value;

        return;
      }

      query[key] =
        typeof value === 'string'
          ? {
              $regex: value,
              $options: 'i',
            }
          : value;
    });

    return query;
  }

  // =========================================================
  // READ ALL
  // =========================================================

  static async findAll(queryParams = {}) {
    const filter = this.buildAllUsersFilter(queryParams);

    return UserModel.find(filter);
  }

  // =========================================================
  // PAGINATED USERS
  // =========================================================

  static async findAllPaginated(queryParams = {}) {
    const filter = this.buildPaginatedUsersFilter(queryParams);

    return getPaginationData(UserModel, filter, '-password', (err) =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'خطای سمت سرور',
        error: JSON.stringify(err),
      }),
    );
  }

  // =========================================================
  // CART
  // =========================================================

  static async getCart(userId) {
    const user = await this.findById(userId);

    return user.cart;
  }
}
