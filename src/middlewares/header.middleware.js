import cors from 'cors';

import { METHODS } from '#configs/constants.js';

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
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

const corsMiddleware = createHeaderMiddleware();

export const headerMiddleware = (req, res, next) =>
  corsMiddleware(req, res, next);
