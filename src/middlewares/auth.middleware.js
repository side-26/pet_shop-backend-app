import { STATUES } from '#configs/constants.js';
import {
  getUserSessionClaims,
  setErrorResponse,
  verifyUser,
} from '#utils/helpers.js';

import { RedisAuthSessionStore } from '../infrastructure/redis/auth/redisAuthSession.store.js';

const redisAuthSessionStore = new RedisAuthSessionStore();

export const authenticated = async (req, res, next) => {
  const authHeader = req.get('Authorization')?.toString() || '';

  const token = authHeader.split(' ')?.[1] || '';

  try {
    const decoded = verifyUser(token);
    const { sessionId, userId } = getUserSessionClaims(decoded);
    const isActiveSession = await redisAuthSessionStore.isOwnedBy({
      sessionId,
      userId,
    });

    if (!isActiveSession) {
      setErrorResponse(STATUES.UN_AUTHORIZED, {
        message: 'نشست ورود معتبر نیست یا منقضی شده است',
      });
    }

    req.user = { ...decoded, userId };
    next();
  } catch (error) {
    next(error);
  }
};
