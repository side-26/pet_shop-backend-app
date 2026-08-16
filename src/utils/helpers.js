import { static as static_ } from 'express';
import jwt from 'jsonwebtoken';

import path from 'path';
import { STATUES } from '#configs/constants.js';
import { getJwtRefreshSecret, getJwtSecret } from '#configs/env.config.js';

export const doesBodyExist = (req, res, msg) => {
  if (!req.body)
    res.status(STATUES.BAD_REQUEST).json({
      isSuccess: false,
      message: msg,
    });
};

export const setErrorResponse = (statusCode, options = {}) => {
  const err = new Error(options.message || 'خطای سمت سرور'); // optionally set a default message

  err.statusCode = statusCode || STATUES.INTERNAL_SERVER;

  Object.assign(err, { ...options });

  throw err;
};

export const setSuccessResponse = (res, statusCode, option) => {
  res.status(statusCode).json({
    isSuccess: true,
    ...option,
  });
};

export const getPaginationQueryParam = (req) => {
  const { page, pageSize } = req.query;
  return {
    page: page || 1,
    pageSize: pageSize || 10,
  };
};

export const createNewQueryParam = (requestBody, filters) => {
  return (
    filters?.reduce((filter, key) => {
      const value = requestBody?.[key];
      if (value) filter[key] = value;
      return filter;
    }, {}) || {}
  );
};

export const getPaginationData = async (
  model,
  filterQuery,
  select,
  onError,
) => {
  try {
    const page = parseInt(filterQuery.page) || 1;
    const limit = parseInt(filterQuery.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = filterQuery.sort ? `-${filterQuery.sort}` : '-createdAt';
    delete filterQuery?.page;
    delete filterQuery?.limit;
    delete filterQuery?.sort;

    const [result, totalItems] = await Promise.all([
      model
        .find(filterQuery)
        .select(select)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .exec(),
      model.countDocuments(filterQuery),
    ]);
    // const totalCount = totalItems?.value;
    const totalPages = Math.ceil(totalItems / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      result,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        itemsPerPage: limit,
        hasNextPage: hasNext,
        hasPrevPage: hasPrev,
        nextPage: hasNext ? page + 1 : null,
        prevPage: hasPrev ? page - 1 : null,
      },
    };
  } catch (error) {
    onError(error);
  }
};

// export const globalPUTController = async();
export const returnFormValidation = (validationSchema, body) => {
  const result = validationSchema.safeParse(body);
  if (!result.success) {
    const fieldErrors = JSON.parse(result?.error?.message)?.map(
      ({ path, message }) => ({
        field: path?.[0],
        value: message,
      }),
    );

    setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
      message: 'اطلاعات وارد شده معتبر نیست', // global message
      data: {
        messages: fieldErrors,
        detail: {}, // extra data if needed
      },
    });

    return;
  }

  const validatedData = result.data;

  return validatedData;
};

export const setAllStatics = (server) => {
  server.use(static_(path.join(process.cwd(), 'public')));
};

export const onCatchPromiseController = (err, next) => {
  // setErrorResponse(STATUES.INTERNAL_SERVER, {
  //   message: 'خطای سمت سرور',
  //   data: JSON.stringify(err),
  // });

  next(err);
};

export const verifyUser = (token, onSuccess) => {
  jwt.verify(token, getJwtSecret(), (err, decoded) => {
    if (err) {
      setErrorResponse(STATUES.UN_AUTHORIZED, {
        message: 'توکن نامعتبر است',
      });
    }

    onSuccess(decoded);
  });
};

export const verifyRefreshToken = (token, onSuccess) => {
  jwt.verify(token, getJwtRefreshSecret(), (err, decoded) => {
    if (err) {
      setErrorResponse(STATUES.UN_AUTHORIZED, {
        message: 'توکن تازه‌سازی نامعتبر است',
      });
    }

    onSuccess(decoded);
  });
};
