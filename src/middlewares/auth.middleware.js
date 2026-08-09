import { STATUES } from '#configs/constants.js';
import { setErrorResponse, verifyUser } from '#utils/helpers.js';

export const authenticated = (req, res, next) => {
  const authHeader = req.get('Authorization')?.toString() || '';

  const token = authHeader.split(' ')?.[1] || '';

  try {
    verifyUser(token, (decoded) => {
      req.user = decoded;
      next();
    });
  } catch {
    setErrorResponse(STATUES.UN_AUTHORIZED, {
      message: 'توکن نامعتبر است',
    });
  }
};
