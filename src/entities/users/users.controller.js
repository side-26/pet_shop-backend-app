import { STATUES } from '#configs/constants.js';
import { UserModel } from '#entities/users/users.model.js';

import {
  getPaginationData,
  // doesBodyExist,
  setErrorResponse,
  setSuccessResponse,
  returnFormValidation,
} from '#utils/index.js';
import {
  userChangePasswordFormBodyValidation,
  userUpdateLocationInfoSchema,
  userUpdatePersonalInfoSchema,
  userZodSchema,
} from './users.schema.js';
import {
  compareTwoPassword,
  doesUserExist,
  getBodyWithHashPassword,
  getUserById,
  getUserFullName,
  setAllUsersFilter,
  setPaginateUsersFilter,
  updateUser,
} from './users.utils.js';

export const createUserController = async (req, res) => {
  try {
    const body = returnFormValidation(userZodSchema, req.body, res);

    const userExist = await doesUserExist({ phoneNumber: body.phoneNumber });

    if (userExist) {
      setErrorResponse(res, STATUES.BAD_FORM_VALIDATION, {
        message: 'کاربری با این مشخصات وجود دارد',
      });
    }

    const formBody = await getBodyWithHashPassword(body, res);

    const newUser = await UserModel.create(formBody);

    setSuccessResponse(res, STATUES.CREATED, {
      message: `کاربر با نام کاربری ${newUser.phoneNumber} با موفقیت ایجاد شد`,
    });
  } catch (e) {
    setErrorResponse(res, STATUES.INTERNAL_SERVER, {
      message: 'خطای سمت سرور',
      data: {
        detail: e,
      },
    });
  }
};

export const updateUserPersonalInfoController = async (req, res) => {
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
    setErrorResponse(res, STATUES.INTERNAL_SERVER, {
      message: 'خطای سمت سرور',
      data: JSON.stringify(err),
    });
  }
};

export const updateUserLocationInfoController = async (req, res) => {
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
    setErrorResponse(res, STATUES.INTERNAL_SERVER, {
      message: 'خطای سمت سرور',
      data: JSON.stringify(err),
    });
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
      setErrorResponse(res, STATUES.NOT_FOUND, {
        message: 'کاربری با این شناسه یافت نشد',
      });

    const isOldPasswordCorrect = await compareTwoPassword(
      user.password,
      body.oldPassword,
    );

    if (!isOldPasswordCorrect)
      setErrorResponse(res, STATUES.BAD_FORM_VALIDATION, {
        message: 'کلمه عبور قبلی صحیح نیست',
      });

    const formBody = await getBodyWithHashPassword(body, res);

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
    setErrorResponse(res, STATUES.INTERNAL_SERVER, {
      message: 'خطای سمت سرور',
      data: err,
    });
  }
};

export const disableUserController = async (req, res) => {
  try {
    const updatedUser = await updateUser(req.params?.id, res, UserModel, {
      isEnable: false,
    });

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `${getUserFullName(updatedUser)} با موفقیت غیرفعال شد.`,
    });
  } catch (err) {
    setErrorResponse(res, STATUES.INTERNAL_SERVER, {
      message: 'خطای سمت سرور',
      data: err,
    });
  }
};

export const enableUserController = async (req, res) => {
  try {
    const updatedUser = await updateUser(req.params?.id, res, UserModel, {
      isEnable: true,
    });
    console.log(updatedUser);
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `${getUserFullName(updatedUser)} با موفقیت فعال شد.`,
    });
  } catch (err) {
    setErrorResponse(res, STATUES.INTERNAL_SERVER, {
      message: 'خطای سمت سرور',
      data: err,
    });
  }
};

export const getAllUsersListController = async (req, res) => {
  try {
    const filterQuery = setAllUsersFilter(req.query);
    console.log(filterQuery);
    const usersList = await UserModel.find(filterQuery);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: usersList,
      totalRecords: usersList?.length,
    });
  } catch (error) {
    setErrorResponse(res, STATUES.OTHER_PROBLEM, {
      message: 'خطای سمت سرور',
      error: JSON.stringify(error),
    });
  }
};

export const getAllUsersListPaginateController = async (req, res) => {
  try {
    const filterQuery = setPaginateUsersFilter(req.query);

    const data = await getPaginationData(
      UserModel,
      filterQuery,
      '-password',
      (err) =>
        setErrorResponse(res, STATUES.OTHER_PROBLEM, {
          message: 'خطای سمت سرور',
          error: JSON.stringify(err),
        }),
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      data,
    });
  } catch (error) {
    setErrorResponse(res, STATUES.OTHER_PROBLEM, {
      message: 'خطای سمت سرور',
      error: JSON.stringify(error),
    });
  }
};

export const getUserByIdController = async (req, res) => {
  try {
    const user = getUserById(req, res, UserModel);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: user,
    });
  } catch (err) {
    setErrorResponse(res, STATUES.INTERNAL_SERVER, {
      message: 'خطای سمت سرور',
      data: err,
    });
  }
};

export const getUserCartListController = async (req, res) => {
  try {
    const user = await getUserById(req, res, UserModel);
    console.log(user);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: user.cart,
    });
  } catch (err) {
    setErrorResponse(res, STATUES.INTERNAL_SERVER, {
      message: 'خطای سمت سرور',
      data: err,
    });
  }
};
