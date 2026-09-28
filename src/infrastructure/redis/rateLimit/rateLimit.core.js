import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { RedisRateLimitStore } from './redisRateLimit.store.js';

export class RateLimiter {
  #entityName;
  #store;

  constructor(entityName) {
    if (typeof entityName !== 'string' || !entityName.trim()) {
      setErrorResponse(STATUES.BAD_REQUEST, {
        message: 'نام محدوده محدودکننده درخواست الزامی است',
      });
    }

    this.#entityName = entityName.trim();
    this.#store = new RedisRateLimitStore();
  }

  #createRouteKey(req) {
    const route = `${req.method}:${req.baseUrl}${req.route.path}`;

    return ['rate-limit', this.#entityName, route, req.ip].join(':');
  }

  limit({ limit = 4, window = 60 } = {}) {
    if (!Number.isInteger(limit) || limit <= 0) {
      setErrorResponse(STATUES.BAD_REQUEST, {
        message: 'حداکثر تعداد درخواست باید یک عدد صحیح مثبت باشد',
      });
    }

    if (!Number.isInteger(window) || window <= 0) {
      setErrorResponse(STATUES.BAD_REQUEST, {
        message: 'بازه زمانی محدودکننده باید یک عدد صحیح مثبت باشد',
      });
    }

    return async (req, res, next) => {
      try {
        if (this.#store.isReady === false) {
          return next();
        }

        const key = this.#createRouteKey(req);

        const result = await this.#store.consume({
          key,
          limit,
          window,
        });

        res.setHeader('RateLimit-Limit', result.limit);

        res.setHeader('RateLimit-Remaining', result.remaining);

        if (!result.allowed) {
          res.setHeader('Retry-After', result.retryAfter);

          return setErrorResponse(STATUES.TOO_MANY_REQUESTS, {
            message:
              'تعداد درخواست‌های ارسالی بیشتر از محدوده است، لطفا بعدا تلاش کنید.',
          });
        }

        return next();
      } catch (error) {
        return next(error);
      }
    };
  }

  applyTo(router, policy) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const registerRoute = router[method].bind(router);
      router[method] = (path, ...handlers) =>
        registerRoute(path, this.limit(policy), ...handlers);
    }
  }
}
