import { STATUES } from '#configs/constants.js';

export const errorHandler = (err, req, res) => {
  return res.status(err.statusCode || STATUES.INTERNAL_SERVER).json({
    isSuccess: false,
    message: err.message || 'خطای سمت سرور', // "User validation failed"
    data: {
      messages: err.fieldErrors || null, // [{ field, message }, ...]
      detail: err.detail || {},
    },
  });
};
