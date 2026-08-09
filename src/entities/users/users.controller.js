import { STATUES } from '#configs/constants.js';

import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  userChangePasswordFormBodyValidation,
  userRefreshTokenSchema,
  userUpdateLocationInfoSchema,
  userUpdatePersonalInfoSchema,
  userZodSchema,
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

// =========================================================
// LOGIN
// =========================================================

export const loginUserController = async (req, res, next) => {
  try {
    const body = returnFormValidation(userZodSchema, req.body);

    const { user, accessToken, refreshToken } = await UserService.login(body);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `کاربر با نام کاربری ${user.phoneNumber} با موفقیت وارد شد`,

      data: {
        accessToken,
        refreshToken,
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

// =========================================================
// UPDATE PERSONAL INFO
// =========================================================

export const updateUserPersonalInfoController = async (req, res, next) => {
  try {
    const body = returnFormValidation(userUpdatePersonalInfoSchema, req.body);

    const updatedUser = await UserService.update(body.userId, body);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `اطلاعات ${UserService.getFullName(updatedUser)} ویرایش شد`,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// =========================================================
// UPDATE LOCATION INFO
// =========================================================

export const updateUserLocationInfoController = async (req, res, next) => {
  try {
    const body = returnFormValidation(userUpdateLocationInfoSchema, req.body);

    const updatedUser = await UserService.update(body.userId, body);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `اطلاعات موقعیتی ${UserService.getFullName(
        updatedUser,
      )} ویرایش شد`,
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

// =========================================================
// GET USER CART
// =========================================================

export const getUserCartListController = async (req, res, next) => {
  try {
    const cart = await UserService.getCart(req.params?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: cart,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};
