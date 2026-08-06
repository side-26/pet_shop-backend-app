import { STATUES } from '#configs/constants.js';

export const errorHandler = (err, _, res, next) => {
  void next;

  res.status(err?.statusCode || STATUES.INTERNAL_SERVER).json({
    isSuccess: false,
    message: err?.message || 'خطای سمت سرور', // "User validation failed"
    data: {
      messages: err?.data?.messages || null, // [{ field, message }, ...]
      detail: err?.data?.detail || null,
    },
  });
};
