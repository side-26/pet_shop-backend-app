import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/index.js';
import { UserModel } from './users.model.js';

import bcrypt from 'bcryptjs';
export const doesUserExist = async (body) => {
  const user = await UserModel.findOne(body).lean();
  console.log(body, user);
  // .lean() returns a plain JS object, faster if you don't need Mongoose methods
  return user || null; // explicitly null if not found
};
export const getBodyWithHashPassword = async (
  requestBody,
  res,
  passwordFieldKey = 'password',
) => {
  try {
    const salt = await bcrypt.genSalt(12); // 12 rounds is safe
    const body = { ...requestBody };
    body[passwordFieldKey] = await bcrypt.hash(body[passwordFieldKey], salt);
    return body;
  } catch {
    setErrorResponse(res, STATUES.INTERNAL_SERVER, {
      message: 'مشکلی پیش آمده لطفا مجددا تلاش فرمایید',
    });
  }
};
