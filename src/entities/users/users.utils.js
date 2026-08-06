import { STATUES } from '#configs/constants.js';
import { createNewQueryParam, setErrorResponse } from '#utils/index.js';
import { UserModel } from './users.model.js';

import bcrypt from 'bcryptjs';
export const doesUserExist = async (body) => {
  const user = await UserModel.findOne(body);

  return user; // explicitly null if not found
};

export const getBodyWithHashPassword = async (
  requestBody,
  passwordFieldKey = 'password',
) => {
  try {
    const salt = await bcrypt.genSalt(12); // 12 rounds is safe
    const body = { ...requestBody };
    body[passwordFieldKey] = await bcrypt.hash(body[passwordFieldKey], salt);
    return body;
  } catch {
    setErrorResponse(STATUES.INTERNAL_SERVER, {
      message: 'مشکلی پیش آمده لطفا مجددا تلاش فرمایید',
    });
  }
};

export const setAllUsersFilter = (queryParams) => {
  const filterParams = createNewQueryParam(queryParams, [
    'fullName',
    'role',
    'phoneNumber',
    'nationalCode',
  ]);
  console.log(filterParams);
  const query = {};

  // Handle fullName search
  if (filterParams.fullName) {
    const nameParts = filterParams.fullName.trim().split(/\s+/);

    if (nameParts.length === 1) {
      // Single word: search in BOTH firstName and lastName
      query.$or = [
        { firstName: { $regex: nameParts[0], $options: 'i' } },
        { lastName: { $regex: nameParts[0], $options: 'i' } },
      ];
    } else {
      // Multiple words: first word = firstName, rest = lastName
      query.firstName = { $regex: nameParts[0], $options: 'i' };
      query.lastName = { $regex: nameParts.slice(1).join(' '), $options: 'i' };
    }

    delete filterParams.fullName;
  }

  // Add other filters (only if value is truthy)
  Object.entries(filterParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query[key] =
        typeof value === 'string' ? { $regex: value, $options: 'i' } : value;
    }
  });

  return query;
};
export const setPaginateUsersFilter = (queryParams) => {
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

  if (filterParams.fullName) {
    const nameParts = filterParams.fullName.trim().split(/\s+/);

    if (nameParts.length === 1) {
      // Single word: search in BOTH firstName and lastName
      query.$or = [
        { firstName: { $regex: nameParts[0], $options: 'i' } },
        { lastName: { $regex: nameParts[0], $options: 'i' } },
      ];
    } else {
      // Multiple words: first word = firstName, rest = lastName
      query.firstName = { $regex: nameParts[0], $options: 'i' };
      query.lastName = { $regex: nameParts.slice(1).join(' '), $options: 'i' };
    }

    delete filterParams.fullName;
  }

  // Add other filters (only if value is truthy)
  Object.entries(filterParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      console.log(key, value);
      (key === 'page') | (key === 'limit') | (key === 'sort')
        ? (query[key] = value)
        : (query[key] =
            typeof value === 'string'
              ? { $regex: value, $options: 'i' }
              : value);
    }
  });

  return query;
};

export const getUserById = async (req, res, UserModel) => {
  const userId = req?.params?.id;

  if (!userId)
    setErrorResponse(STATUES.BAD_REQUEST, {
      message: 'ورودی معتبر نیست',
    });

  const user = await UserModel.findById(userId?.toString());

  if (!user)
    setErrorResponse(STATUES.NOT_FOUND, {
      message: 'کاربری با این مشخصات یافت نشد',
    });
  return user;
};

export const updateUser = async (userId, res, UserModel, updateRecord) => {
  if (!userId)
    setErrorResponse(STATUES.BAD_REQUEST, {
      message: 'ورودی معتبر نیست',
    });

  const result = await UserModel.findByIdAndUpdate(
    userId,
    {
      ...updateRecord,
    },
    { new: true },
  );

  if (!result)
    setErrorResponse(STATUES.NOT_FOUND, {
      message: 'کاربری یافت نشد',
    });

  return result;
};

export const getUserFullName = (
  obj,
  firstNameKey = 'firstName',
  lastNameKey = 'lastName',
) => {
  const firstName = obj?.[firstNameKey];

  const lastName = obj?.[lastNameKey];

  return firstName || lastName
    ? `${firstName}${lastName ? ` ${lastName}` : ''}`
    : 'کاربر';
};

export const compareTwoPassword = async (hashedPassword, rawPassword) => {
  return bcrypt.compare(rawPassword, hashedPassword);
};
