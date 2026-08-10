import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import { RATE_LIMIT, STATUES } from '#configs/constants.js';

const RATE_LIMIT_MESSAGE =
  'تعداد درخواست های زیاد، لطفا بعد از چند دقیقه مجددا تلاش فرمایید';

export const createRateLimiter = (overrides = {}) =>
  rateLimit({
    windowMs: RATE_LIMIT.API_WINDOW_MS,
    limit: RATE_LIMIT.API_MAX_REQUESTS,
    standardHeaders: RATE_LIMIT.STANDARD_HEADERS,
    legacyHeaders: false,
    statusCode: STATUES.TOO_MANY_REQUESTS,
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({
        isSuccess: false,
        message: RATE_LIMIT_MESSAGE,
        data: { messages: null, detail: null },
      });
    },
    ...overrides,
  });

export const rateLimiterMiddleware = createRateLimiter();

// Helmet's maintained defaults protect this JSON API without a browser-only CSP.
export const securityHeadersMiddleware = helmet();
