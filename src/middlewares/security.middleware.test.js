import express from 'express';
import request from 'supertest';

import { STATUES } from '#configs/constants.js';
import {
  createRateLimiter,
  securityHeadersMiddleware,
} from '#middlewares/security.middleware.js';

const createApp = (limit = 2) => {
  const app = express();
  app.use(securityHeadersMiddleware);
  app.use('/api', createRateLimiter({ windowMs: 60_000, limit }));
  app.get('/api/health', (_req, res) => res.status(STATUES.SUCCESS).json({}));
  return app;
};

describe('security middleware', () => {
  it('adds Helmet security headers', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.headers).toHaveProperty(
      'x-content-type-options',
      'nosniff',
    );
    expect(response.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
  });

  it('returns the application error shape and standard rate-limit headers', async () => {
    const app = createApp(1);

    await request(app).get('/api/health').expect(STATUES.SUCCESS);
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(STATUES.TOO_MANY_REQUESTS);
    expect(response.body).toEqual({
      isSuccess: false,
      message:
        'تعداد درخواست های زیاد، لطفا بعد از چند دقیقه مجددا تلاش فرمایید',
      data: { messages: null, detail: null },
    });
    expect(response.headers).toHaveProperty('ratelimit');
    expect(response.headers).toHaveProperty('retry-after');
    expect(response.headers).not.toHaveProperty('x-ratelimit-limit');
  });
});
