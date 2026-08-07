import jwt from 'jsonwebtoken';

import { STATUES } from '#configs/constants.js';
import { UserModel } from '#entities/users/users.model.js';

import {
  getPaginationData,
  // doesBodyExist,
  setErrorResponse,
  setSuccessResponse,
  returnFormValidation,
  onCatchPromiseController,
  verifyUser,
} from '#utils/index.js';
import {
  userChangePasswordFormBodyValidation,
  userUpdateLocationInfoSchema,
  userUpdatePersonalInfoSchema,
  userZodSchema,
} from './users.schema.js';
import {
  compareTwoPassword,
  createNewToken,
  doesUserExist,
  getBodyWithHashPassword,
  getUserById,
  getUserFullName,
  setAllUsersFilter,
  setPaginateUsersFilter,
  updateUser,
} from './users.helpers.js';

export const createUserController = async (req, res, next) => {
  try {
    const body = returnFormValidation(userZodSchema, req.body);

    const userExist = await doesUserExist({ phoneNumber: body.phoneNumber });

    if (userExist) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'کاربری با این مشخصات وجود دارد',
      });
    }

    const formBody = await getBodyWithHashPassword(body);

    const newUser = await UserModel.create(formBody);

    setSuccessResponse(res, STATUES.CREATED, {
      message: `کاربر با نام کاربری ${newUser.phoneNumber} با موفقیت ایجاد شد`,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const loginUserController = async (req, res, next) => {
  try {
    const body = returnFormValidation(userZodSchema, req.body);

    const user = await doesUserExist({ phoneNumber: body.phoneNumber });

    if (!user)
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'کاربری با این مشخصات یافت نشد',
      });

    const isPasswordCorrect = await compareTwoPassword(
      user.password,
      body.password,
    );

    if (!isPasswordCorrect)
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'کاربری با این مشخصات یافت نشد',
      });

    const accessToken = createNewToken(
      user._id,
      user.phoneNumber,
      user.role,
      '7h',
    );

    const refreshToken = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '7d' },
    );

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

export const refreshTokenController = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'توکن نامعتبر است',
      });
    }
    verifyUser(req, res, refreshToken, (decoded) => {
      const newToken = createNewToken(
        decoded.userId,
        decoded.phoneNumber,
        decoded.role,
        '7h',
      );

      setSuccessResponse(res, STATUES.CREATED, {
        message: null,
        data: {
          accessToken: newToken,
        },
      });
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const updateUserPersonalInfoController = async (req, res, next) => {
  try {
    const formBody = returnFormValidation(
      userUpdatePersonalInfoSchema,
      req.body,
      res,
    );

    const updatedUser = await updateUser(
      req.body.userId,
      res,
      UserModel,
      formBody,
    );

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `اطلاعات ${getUserFullName(updatedUser)} ویرایش شد`,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const updateUserLocationInfoController = async (req, res, next) => {
  try {
    const formBody = returnFormValidation(
      userUpdateLocationInfoSchema,
      req.body,
      res,
    );

    const updatedUser = await updateUser(
      req.body.userId,
      res,
      UserModel,
      formBody,
    );

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `اطلاعات موقعیتی ${getUserFullName(updatedUser)} ویرایش شد`,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const changeUserPasswordController = async (req, res) => {
  try {
    const body = returnFormValidation(
      userChangePasswordFormBodyValidation,
      req.body,
      res,
    );

    const user = await doesUserExist({ _id: body.userId });

    if (!user)
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'کاربری با این شناسه یافت نشد',
      });

    const isOldPasswordCorrect = await compareTwoPassword(
      user.password,
      body.oldPassword,
    );

    if (!isOldPasswordCorrect)
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'کلمه عبور قبلی صحیح نیست',
      });

    const formBody = await getBodyWithHashPassword(body);

    await UserModel.updateOne(
      { _id: formBody.userId },
      {
        password: formBody.password,
      },
    );

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `${getUserFullName(user)} با موفقیت کلمه عبور ویرایش شد.`,
    });
  } catch (err) {
    setErrorResponse(STATUES.INTERNAL_SERVER, {
      message: 'خطای سمت سرور',
      data: err,
    });
  }
};

export const disableUserController = async (req, res, next) => {
  try {
    const updatedUser = await updateUser(req.params?.id, res, UserModel, {
      isEnable: false,
    });

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `${getUserFullName(updatedUser)} با موفقیت غیرفعال شد.`,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const enableUserController = async (req, res, next) => {
  try {
    const updatedUser = await updateUser(req.params?.id, res, UserModel, {
      isEnable: true,
    });
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `${getUserFullName(updatedUser)} با موفقیت فعال شد.`,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const getAllUsersListController = async (req, res, next) => {
  try {
    const filterQuery = setAllUsersFilter(req.query);
    const usersList = await UserModel.find(filterQuery);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: usersList,
      totalRecords: usersList?.length,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const getAllUsersListPaginateController = async (req, res, next) => {
  try {
    const filterQuery = setPaginateUsersFilter(req.query);

    const data = await getPaginationData(
      UserModel,
      filterQuery,
      '-password',
      (err) =>
        setErrorResponse(STATUES.OTHER_PROBLEM, {
          message: 'خطای سمت سرور',
          error: JSON.stringify(err),
        }),
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      data,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const getUserByIdController = async (req, res, next) => {
  try {
    const user = getUserById(req, res, UserModel);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: user,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

export const getUserCartListController = async (req, res, next) => {
  try {
    const user = await getUserById(req, res, UserModel);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: user.cart,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};
