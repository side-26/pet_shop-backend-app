import { STATUES } from '#configs/constants.js';

import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  addCartItemSchema,
  userChangePasswordFormBodyValidation,
  addUserAddressSchema,
  addWishlistItemSchema,
  cartEntryIdSchema,
  editUserAddressSchema,
  userAddressIdSchema,
  userRefreshTokenSchema,
  userRegisterSchema,
  userResetPasswordSchema,
  userSendOtpSchema,
  userVerifyOtpSchema,
  userUpdatePersonalInfoSchema,
  userZodSchema,
  wishlistEntryIdSchema,
} from './users.schema.js';

import { UserService } from './users.service.js';

// =========================================================
// CREATE USER
// =========================================================

export const createUserController = async (req, res, next) => {
  try {
    const body = returnFormValidation(userZodSchema, req.body);

    const user = await UserService.create(body);

    setSuccessResponse(res, STATUES.CREATED, {
      message: `کاربر با نام کاربری ${user.phoneNumber} با موفقیت ایجاد شد`,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const registerUserController = async (req, res, next) => {
  try {
    const credentials = returnFormValidation(userRegisterSchema, req.body);

    await UserService.register(credentials);

    setSuccessResponse(res, STATUES.CREATED, {
      message: 'حساب کاربری شما با موفقیت ساخته شد لطفا وارد اپلیکیشن شوید',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const sendUserOtpController = async (req, res, next) => {
  try {
    const { phoneNumber } = returnFormValidation(userSendOtpSchema, req.body);
    const { remainingSeconds, sent } = await UserService.sendOtp({
      phoneNumber,
      ip: req.ip,
    });

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: sent
        ? 'کد تأیید با موفقیت ارسال شد'
        : `کد تأیید در حال ارسال است یا قبلاً ارسال شده است؛ لطفاً پس از ${remainingSeconds} ثانیه دوباره تلاش کنید`,
      data: { remainingSeconds },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const verifyUserOtpController = async (req, res, next) => {
  try {
    const body = returnFormValidation(userVerifyOtpSchema, req.body);
    const result = await UserService.verifyOtp({
      phoneNumber: body.phoneNumber,
      otpCode: body['otp-code'],
      ip: req.ip,
      resetPassword: body['reset-password'],
    });

    setSuccessResponse(res, STATUES.SUCCESS, {
      ...(result.resetPassword && {
        message: 'کد تأیید شما معتبر است',
      }),
      data: result.data,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const resetUserPasswordController = async (req, res, next) => {
  try {
    const body = returnFormValidation(userResetPasswordSchema, req.body);
    const data = await UserService.resetPassword({
      authorization: req.headers.authorization,
      newPassword: body.newPassword,
    });

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'کلمه عبور شما با موفقیت بازنشانی شد',
      data,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

// =========================================================
// LOGIN
// =========================================================

export const loginUserController = async (req, res, next) => {
  try {
    const body = returnFormValidation(userZodSchema, req.body);

    const {
      user,
      userId,
      role,
      accessToken,
      refreshToken,
      accessExp,
      sessionExp,
    } = await UserService.login(body);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `کاربر با نام کاربری ${user.phoneNumber} با موفقیت وارد شد`,

      data: {
        accessToken,
        refreshToken,
        sessionExp,
        userId,
        role,
        accessExp,
      },
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// =========================================================
// REFRESH TOKEN
// =========================================================

export const refreshTokenController = async (req, res, next) => {
  try {
    const { refreshToken } = returnFormValidation(
      userRefreshTokenSchema,
      req.body,
    );
    const accessToken = await UserService.refreshAccessToken(refreshToken);

    setSuccessResponse(res, STATUES.CREATED, {
      message: null,

      data: {
        accessToken,
      },
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const addUserAddressController = async (req, res, next) => {
  try {
    const body = returnFormValidation(addUserAddressSchema, req.body);
    const address = await UserService.addAddress(req.user, body);
    setSuccessResponse(res, STATUES.CREATED, { data: address });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const editUserAddressController = async (req, res, next) => {
  try {
    const { addressId } = returnFormValidation(userAddressIdSchema, req.params);
    const body = returnFormValidation(editUserAddressSchema, req.body);
    const address = await UserService.editAddress(req.user, addressId, body);
    setSuccessResponse(res, STATUES.SUCCESS, { data: address });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getUserAddressListController = async (req, res, next) => {
  try {
    const addresses = await UserService.getAddresses(req.user);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: addresses,
      totalRecords: addresses.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const addCartItemController = async (req, res, next) => {
  try {
    const body = returnFormValidation(addCartItemSchema, req.body);
    const cart = await UserService.addCartItem(req.user, body);
    setSuccessResponse(res, STATUES.CREATED, { data: cart });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const deleteCartItemController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(cartEntryIdSchema, req.params);
    const items = await UserService.deleteCartItem(req.user, id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: items });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getCartItemsController = async (req, res, next) => {
  try {
    const cart = await UserService.getCartItems(req.user);
    setSuccessResponse(res, STATUES.SUCCESS, { data: cart });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const emptyCartController = async (req, res, next) => {
  try {
    const cart = await UserService.emptyCart(req.user);
    setSuccessResponse(res, STATUES.SUCCESS, { data: cart });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const addWishlistItemController = async (req, res, next) => {
  try {
    const body = returnFormValidation(addWishlistItemSchema, req.body);
    const item = await UserService.addWishlistItem(req.user, body);
    setSuccessResponse(res, STATUES.CREATED, { data: item });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const deleteWishlistItemController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(wishlistEntryIdSchema, req.params);
    const items = await UserService.deleteWishlistItem(req.user, id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: items });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getWishlistItemsController = async (req, res, next) => {
  try {
    const items = await UserService.getWishlistItems(req.user);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: items,
      totalRecords: items.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

// =========================================================
// UPDATE PERSONAL INFO
// =========================================================

export const updateUserPersonalInfoController = async (req, res, next) => {
  try {
    const body = returnFormValidation(userUpdatePersonalInfoSchema, req.body);

    const updatedUser = await UserService.updatePersonalInfo(
      req.user,
      body,
      req.file,
    );

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `اطلاعات ${UserService.getFullName(updatedUser)} ویرایش شد`,
      data: UserService.format(updatedUser),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// =========================================================
// CHANGE PASSWORD
// =========================================================

export const changeUserPasswordController = async (req, res, next) => {
  try {
    const body = returnFormValidation(
      userChangePasswordFormBodyValidation,
      req.body,
    );

    const user = await UserService.changePassword(body);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `${UserService.getFullName(
        user,
      )} با موفقیت کلمه عبور ویرایش شد.`,
    });
  } catch (err) {
    /*
     * Do not turn every error into INTERNAL_SERVER.
     *
     * For example:
     * - user not found -> 404
     * - wrong old password -> 422
     *
     * Let the centralized error middleware preserve
     * the original status.
     */
    onCatchPromiseController(err, next);
  }
};

// =========================================================
// DISABLE USER
// =========================================================

export const disableUserController = async (req, res, next) => {
  try {
    const user = await UserService.disable(req.params?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `${UserService.getFullName(user)} با موفقیت غیرفعال شد.`,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// =========================================================
// ENABLE USER
// =========================================================

export const enableUserController = async (req, res, next) => {
  try {
    const user = await UserService.enable(req.params?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `${UserService.getFullName(user)} با موفقیت فعال شد.`,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// =========================================================
// GET ALL USERS
// =========================================================

export const getAllUsersListController = async (req, res, next) => {
  try {
    const users = await UserService.findAll(req.query);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: users,
      totalRecords: users.length,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// =========================================================
// GET PAGINATED USERS
// =========================================================

export const getAllUsersListPaginateController = async (req, res, next) => {
  try {
    const data = await UserService.findAllPaginated(req.query);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// =========================================================
// GET USER BY ID
// =========================================================

export const getUserByIdController = async (req, res, next) => {
  try {
    const user = await UserService.findById(req.params?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: user,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};
