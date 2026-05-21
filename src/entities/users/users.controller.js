import { STATUES } from '#configs/constants.js';
import { UserModel } from '#entities/users/users.model.js';
import { returnFormValidation } from '#utils/globalErrors.js';
import {
  // doesBodyExist,
  setErrorResponse,
  setSuccessResponse,
} from '#utils/index.js';
import { userZodSchema } from './users.schema.js';
import { doesUserExist, getBodyWithHashPassword } from './users.utils.js';
export const createUserController = async (req, res) => {
  try {
    const body = returnFormValidation(userZodSchema, req.body, res);
    if (doesUserExist({ phoneNumber: body.phoneNumber }))
      setErrorResponse(res, STATUES.BAD_FORM_VALIDATION, {
        message: 'کاربری با این مشخصات وجود دارد',
      });

    const { password, phoneNumber } = await getBodyWithHashPassword(body, res);

    await UserModel.create({ password, phoneNumber });

    setSuccessResponse(res, STATUES.CREATED, {
      message: 'ثبت نام شما موفق بود در حال انتقال...',
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
