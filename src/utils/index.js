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
