import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
  ERROR_CODES,
  IMAGE_FORMATS,
  ROLES,
  STATUES,
  USER_ADDRESS_LIMITS,
  USER_ITEM_TYPES,
} from '#configs/constants.js';
import { getJwtRefreshSecret, getJwtSecret } from '#configs/env.config.js';
import logger from '#configs/logger.js';
import { PetService } from '#entities/pets/pets.service.js';
import { ProductService } from '#entities/products/products.service.js';
import { ObjectStorageService } from '#services/objectStorage.service.js';

import {
  createNewQueryParam,
  getPaginationData,
  setErrorResponse,
  verifyRefreshToken,
} from '#utils/helpers.js';
import { formatImageFile } from '#utils/image.helpers.js';

import { UserModel } from './users.model.js';
import { calculateCartPrices, formatUserFullName } from './users.helpers.js';
import { userAddressSchema } from './users.schema.js';

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
      getJwtSecret(),
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
      getJwtRefreshSecret(),
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

  static async register(credentials) {
    return this.create({
      ...credentials,
      role: ROLES.CUSTOMER,
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
    const accessExp = jwt.decode(accessToken).exp * 1000;
    const sessionExp = jwt.decode(refreshToken).exp * 1000;

    return {
      user,
      userId: user._id.toString(),
      role: user.role,
      accessToken,
      refreshToken,
      accessExp,
      sessionExp,
    };
  }

  // =========================================================
  // REFRESH TOKEN
  // =========================================================

  static async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'توکن نامعتبر است',
      });
    }

    return new Promise((resolve, reject) => {
      try {
        verifyRefreshToken(refreshToken, async (decoded) => {
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

    const { userId: ignoredUserId, ...data } = updateRecord;

    void ignoredUserId;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: data,
      },
      {
        returnDocument: 'after',
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

  static resolveProfileTargetUserId(actor, requestedUserId) {
    const actorId = actor?.userId || actor?.id;

    if (!actorId) {
      setErrorResponse(STATUES.UN_AUTHORIZED, {
        message: 'هویت کاربر احراز نشده است',
      });
    }

    const targetUserId = requestedUserId || actorId;
    const isEditingAnotherUser = targetUserId.toString() !== actorId.toString();

    if (isEditingAnotherUser && actor.role !== ROLES.ADMIN) {
      setErrorResponse(STATUES.NO_ACCESS, {
        message: 'شما اجازه ویرایش اطلاعات کاربر دیگری را ندارید',
        code: ERROR_CODES.USER_PROFILE_ACCESS_DENIED,
      });
    }

    return targetUserId;
  }

  static async updatePersonalInfo(actor, updateRecord, avatarFile) {
    const { userId: requestedUserId, ...data } = updateRecord;
    const userId = this.resolveProfileTargetUserId(actor, requestedUserId);

    if (!avatarFile && Object.keys(data).length === 0) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'حداقل یک فیلد پروفایل یا تصویر آواتار باید ارسال شود',
      });
    }

    const avatarProcessing = avatarFile
      ? formatImageFile(avatarFile.buffer, IMAGE_FORMATS.WEBP).catch(() =>
          setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
            message: 'تصویر آواتار ارسال‌شده معتبر نیست',
            code: 'INVALID_AVATAR_IMAGE',
          }),
        )
      : Promise.resolve(null);

    const [currentUser, processedAvatar] = await Promise.all([
      this.findById(userId),
      avatarProcessing,
    ]);

    let uploadedAvatarKey;
    let avatarUrl;

    if (processedAvatar) {
      const key = ObjectStorageService.createObjectKey(
        `users/${currentUser._id}/avatar`,
        IMAGE_FORMATS.WEBP,
      );

      uploadedAvatarKey = await ObjectStorageService.uploadObject({
        key,
        body: processedAvatar,
        contentType: 'image/webp',
      });
      avatarUrl = ObjectStorageService.buildPublicUrl(uploadedAvatarKey);
    }

    let updatedUser;

    try {
      updatedUser = await this.update(
        userId,
        avatarUrl ? { ...data, avatar: avatarUrl } : data,
      );
    } catch (error) {
      if (uploadedAvatarKey) {
        await ObjectStorageService.deleteObject(uploadedAvatarKey).catch(
          (cleanupError) =>
            logger.app.error(
              'حذف آواتار بارگذاری‌شده پس از خطای پایگاه داده ناموفق بود',
              cleanupError,
              { userId, key: uploadedAvatarKey },
            ),
        );
      }

      throw error;
    }

    let previousAvatarKey;
    if (currentUser.avatar) {
      try {
        previousAvatarKey = ObjectStorageService.getObjectKeyFromUrl(
          currentUser.avatar,
        );
      } catch (error) {
        logger.app.error(
          'استخراج کلید آواتار قبلی از نشانی ذخیره‌شده ناموفق بود',
          error,
          { userId, avatar: currentUser.avatar },
        );
      }
    }
    if (uploadedAvatarKey && previousAvatarKey) {
      await ObjectStorageService.deleteObject(previousAvatarKey).catch(
        (error) =>
          logger.app.error('حذف آواتار قبلی کاربر ناموفق بود', error, {
            userId,
            key: previousAvatarKey,
          }),
      );
    }

    return updatedUser;
  }

  static getAuthenticatedUserId(actor) {
    const userId = actor?.userId || actor?.id;
    if (!userId) {
      setErrorResponse(STATUES.UN_AUTHORIZED, {
        message: 'هویت کاربر احراز نشده است',
      });
    }
    return userId;
  }

  static resolveAddressReceiver(user, address) {
    if (!address.receiverIsMe) return address;

    const receiver = {
      firstName: user.firstName,
      lastName: user.lastName,
      nationalCode: user.nationalCode,
      phoneNumber: user.phoneNumber,
    };
    if (Object.values(receiver).some((value) => !value)) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'اطلاعات هویتی کاربر برای ثبت گیرنده کامل نیست',
        code: ERROR_CODES.USER_RECEIVER_INFO_INCOMPLETE,
      });
    }

    return { ...address, ...receiver };
  }

  static validateAddress(address) {
    const result = userAddressSchema.safeParse(address);
    if (!result.success) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'اطلاعات نشانی معتبر نیست',
        data: {
          messages: result.error.issues.map((issue) => ({
            field: issue.path[0],
            value: issue.message,
          })),
          detail: {},
        },
      });
    }
    return result.data;
  }

  static async addAddress(actor, address) {
    const userId = this.getAuthenticatedUserId(actor);
    const user = await this.findById(userId);
    const resolvedAddress = this.validateAddress(
      this.resolveAddressReceiver(user, address),
    );
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, 'addresses.4': { $exists: false } },
      { $push: { addresses: resolvedAddress } },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updatedUser) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: `حداکثر ${USER_ADDRESS_LIMITS.MAX_ADDRESSES} نشانی قابل ثبت است`,
        code: ERROR_CODES.USER_ADDRESS_LIMIT_REACHED,
      });
    }

    return updatedUser.addresses.at(-1);
  }

  static async editAddress(actor, addressId, changes) {
    const userId = this.getAuthenticatedUserId(actor);
    const user = await this.findById(userId);
    const existingAddress = user.addresses.id(addressId);
    if (!existingAddress) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نشانی یافت نشد',
        code: ERROR_CODES.USER_ADDRESS_NOT_FOUND,
      });
    }

    const existingValue = existingAddress.toObject();
    let candidate = { ...existingValue, ...changes };
    if (existingValue.receiverIsMe && changes.receiverIsMe === false) {
      candidate = {
        ...candidate,
        firstName: changes.firstName,
        lastName: changes.lastName,
        nationalCode: changes.nationalCode,
        phoneNumber: changes.phoneNumber,
      };
    }
    candidate = this.resolveAddressReceiver(user, candidate);
    const validatedAddress = this.validateAddress(candidate);

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, 'addresses._id': addressId },
      { $set: { 'addresses.$': { ...validatedAddress, _id: addressId } } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!updatedUser) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نشانی یافت نشد',
        code: ERROR_CODES.USER_ADDRESS_NOT_FOUND,
      });
    }

    return updatedUser.addresses.id(addressId);
  }

  static async getAddresses(actor) {
    const userId = this.getAuthenticatedUserId(actor);
    const user = await this.findById(userId);
    return user.addresses;
  }

  static validateReferencedItem(itemId, itemType) {
    return itemType === USER_ITEM_TYPES.PRODUCT
      ? ProductService.findById(itemId)
      : PetService.findById(itemId);
  }

  static validateCartReferencedItem(itemId, itemType) {
    return itemType === USER_ITEM_TYPES.PRODUCT
      ? ProductService.findCustomerById(itemId)
      : PetService.findCustomerById(itemId);
  }

  static async recalculateCart(userId) {
    const user = await UserModel.findById(userId).populate({
      path: 'cart.items.item',
      select:
        'title mainImage mainImageThumbnail price discountPercentage enable slug',
    });
    if (!user) {
      setErrorResponse(STATUES.NOT_FOUND, { message: 'کاربر یافت نشد' });
    }

    const prices = calculateCartPrices(user.cart.items);
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          'cart.totalPrice': prices.totalPrice,
          'cart.discountPrice': prices.discountPrice,
        },
      },
      { runValidators: true },
    );
    user.cart.totalPrice = prices.totalPrice;
    user.cart.discountPrice = prices.discountPrice;
    return user.cart;
  }

  static async addCartItem(actor, { itemId, itemType, quantity }) {
    const userId = this.getAuthenticatedUserId(actor);
    await this.validateCartReferencedItem(itemId, itemType);

    const existingItemUpdate = await UserModel.findOneAndUpdate(
      {
        _id: userId,
        'cart.items': { $elemMatch: { item: itemId, itemType } },
      },
      { $inc: { 'cart.items.$.quantity': quantity } },
      { returnDocument: 'after', runValidators: true },
    );

    if (!existingItemUpdate) {
      const updatedUser = await UserModel.findOneAndUpdate(
        {
          _id: userId,
          'cart.items': {
            $not: { $elemMatch: { item: itemId, itemType } },
          },
        },
        { $push: { 'cart.items': { item: itemId, itemType, quantity } } },
        { returnDocument: 'after', runValidators: true },
      );
      if (!updatedUser) {
        const concurrentlyAddedItemUpdate = await UserModel.findOneAndUpdate(
          {
            _id: userId,
            'cart.items': { $elemMatch: { item: itemId, itemType } },
          },
          { $inc: { 'cart.items.$.quantity': quantity } },
          { returnDocument: 'after', runValidators: true },
        );
        if (!concurrentlyAddedItemUpdate) {
          await this.findById(userId);
        }
      }
    }

    return this.recalculateCart(userId);
  }

  static async deleteCartItem(actor, cartEntryId) {
    const userId = this.getAuthenticatedUserId(actor);
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, 'cart.items._id': cartEntryId },
      { $pull: { 'cart.items': { _id: cartEntryId } } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!updatedUser) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'آیتم سبد خرید یافت نشد',
        code: ERROR_CODES.USER_CART_ITEM_NOT_FOUND,
      });
    }
    return this.recalculateCart(userId);
  }

  static async getCartItems(actor) {
    const userId = this.getAuthenticatedUserId(actor);
    return this.recalculateCart(userId);
  }

  static async emptyCart(actor) {
    const userId = this.getAuthenticatedUserId(actor);
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          'cart.items': [],
          'cart.totalPrice': 0,
          'cart.discountPrice': 0,
        },
      },
      { returnDocument: 'after', runValidators: true },
    );
    if (!updatedUser) {
      setErrorResponse(STATUES.NOT_FOUND, { message: 'کاربر یافت نشد' });
    }
    return updatedUser.cart;
  }

  static async addWishlistItem(actor, { itemId, itemType }) {
    const userId = this.getAuthenticatedUserId(actor);
    await this.validateReferencedItem(itemId, itemType);
    const updatedUser = await UserModel.findOneAndUpdate(
      {
        _id: userId,
        wishlist: { $not: { $elemMatch: { item: itemId, itemType } } },
      },
      { $push: { wishlist: { item: itemId, itemType } } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!updatedUser) {
      await this.findById(userId);
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'این آیتم قبلاً به لیست علاقه‌مندی‌ها اضافه شده است',
        code: ERROR_CODES.USER_WISHLIST_ITEM_ALREADY_EXISTS,
      });
    }
    return updatedUser.wishlist.at(-1);
  }

  static async deleteWishlistItem(actor, wishlistEntryId) {
    const userId = this.getAuthenticatedUserId(actor);
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, 'wishlist._id': wishlistEntryId },
      { $pull: { wishlist: { _id: wishlistEntryId } } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!updatedUser) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'آیتم لیست علاقه‌مندی‌ها یافت نشد',
        code: ERROR_CODES.USER_WISHLIST_ITEM_NOT_FOUND,
      });
    }
    return updatedUser.wishlist;
  }

  static async getWishlistItems(actor) {
    const userId = this.getAuthenticatedUserId(actor);
    const user = await UserModel.findById(userId).populate('wishlist.item');
    if (!user) {
      setErrorResponse(STATUES.NOT_FOUND, { message: 'کاربر یافت نشد' });
    }
    return user.wishlist;
  }

  static format(user) {
    if (!user) return null;

    const value =
      typeof user.toObject === 'function' ? user.toObject() : { ...user };
    delete value.password;

    return value;
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
    return formatUserFullName(user, firstNameKey, lastNameKey);
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
}
