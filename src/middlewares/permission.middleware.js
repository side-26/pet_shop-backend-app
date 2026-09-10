import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { hasPermission } from './permission.js';

const getPermissionUser = (user) => ({
  ...user,
  roles: user?.roles || (user?.role ? [user.role] : []),
});

export const permissionMiddleware = (resource, action) => (req, res, next) => {
  if (hasPermission(getPermissionUser(req.user), resource, action, req.body)) {
    next();
    return;
  }

  setErrorResponse(STATUES.NO_ACCESS, {
    message: 'شما اجازه انجام این عملیات را ندارید',
  });
};
