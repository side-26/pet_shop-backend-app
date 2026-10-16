import express from 'express';
import request from 'supertest';

import { createHeaderMiddleware } from '#middlewares/header.middleware.js';

const createApp = (origin) => {
  const app = express();
  app.use(createHeaderMiddleware({ origin }));
  app.get('/health', (_req, res) => res.sendStatus(204));
  return app;
};

describe('header middleware', () => {
  it('allows requests from the configured frontend origin', async () => {
    const response = await request(createApp('http://localhost:3000'))
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(204);
    expect(response.headers).toHaveProperty(
      'access-control-allow-origin',
      'http://localhost:3000',
    );
  });

  it('does not allow an unconfigured frontend origin', async () => {
    const response = await request(createApp('http://localhost:3000'))
      .get('/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(204);
    expect(response.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('allows preflight requests from the configured frontend origin', async () => {
    const response = await request(createApp('http://localhost:3000'))
      .options('/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers).toHaveProperty(
      'access-control-allow-origin',
      'http://localhost:3000',
    );
  });
});
