import { STATUES } from '#configs/constants.js';

export const errorHandler = (err, req, res, next) => {
  void next;

  const statusCode = err?.statusCode || STATUES.INTERNAL_SERVER;

  // ❌ Remove logging from here too - logRequest handles everything
  // Only send response

  // Send response with request ID
  res.status(statusCode).json({
    isSuccess: false,
    message: err?.message || 'خطای سمت سرور',
    data: {
      messages: err?.data?.messages || null,
      detail: err?.data?.detail || null,
    },
    requestId: req?.id,
    timestamp: new Date().toISOString(),
  });
};
