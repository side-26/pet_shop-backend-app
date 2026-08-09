import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

export const roleMiddleware = (allowedRoles) => (req, res, next) => {
  const userRole = req.user?.role;

  const roles =
    typeof allowedRoles === 'string'
      ? [allowedRoles?.toLocaleLowerCase()]
      : allowedRoles?.map((role) => role?.toLocaleLowerCase());

  if (!roles.includes(userRole)) {
    setErrorResponse(STATUES.NO_ACCESS, {
      message: 'شما اجازه دسترسی به این بخش را ندارید',
    });
  }

  next();
};
