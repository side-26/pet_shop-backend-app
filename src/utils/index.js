import { static as static_ } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { STATUES } from '#configs/constants.js';

export const doesBodyExist = (req, res, msg) => {
  if (!req.body)
    res.status(STATUES.BAD_REQUEST).json({
      isSuccess: false,
      message: msg,
    });
};

export const setErrorResponse = (res, statusCode, option) => {
  res.status(statusCode).json({
    isSuccess: false,
    ...option,
  });
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
    console.log(filterQuery.limit, 'filterQuery.limit');
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
export const returnFormValidation = (validationSchema, body, res) => {
  const result = validationSchema.safeParse(body);
  if (!result.success) {
    const fieldErrors = JSON.parse(result?.error?.message)?.map(
      ({ path, message }) => ({
        field: path?.[0],
        value: message,
      }),
    );

    setErrorResponse(res, STATUES.BAD_FORM_VALIDATION, {
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
  server.use(static_(path.join(__dirname, 'public')));
};
