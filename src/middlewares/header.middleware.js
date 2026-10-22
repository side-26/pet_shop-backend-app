import cors from 'cors';

import { CORS_ALLOWED_HEADERS, METHODS } from '#configs/constants.js';

const DEFAULT_CORS_ORIGIN = 'https://your-frontend.com';

export const createHeaderMiddleware = ({
  origin = process.env.CORS_ORIGIN?.trim() || DEFAULT_CORS_ORIGIN,
} = {}) =>
  cors({
    origin: (requestOrigin, callback) => {
      const isAllowed = !requestOrigin || requestOrigin === origin;
      callback(null, isAllowed);
    },
    methods: Object.values(METHODS),
    allowedHeaders: CORS_ALLOWED_HEADERS,
  });

const corsMiddleware = createHeaderMiddleware();

export const headerMiddleware = (req, res, next) =>
  corsMiddleware(req, res, next);
