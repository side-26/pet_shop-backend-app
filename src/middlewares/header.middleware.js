import cors from 'cors';

import { METHODS } from '#configs/constants.js';

const corsMiddleware = cors({
  origin: 'https://your-frontend.com',
  methods: Object.values(METHODS),
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export const headerMiddleware = (req, res, next) =>
  corsMiddleware(req, res, next);
