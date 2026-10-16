import express from 'express';
import request from 'supertest';

import { METHODS, STATUES } from '#configs/constants.js';
import { API_ROUTE_METHODS } from '#configs/routeMethods.config.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import {
  allowMethods,
  apiMethodMiddleware,
} from '#middlewares/method.middleware.js';

const createApp = () => {
  const app = express();
  app.all('/users/register', allowMethods(METHODS.post));
  app.post('/users/register', (_req, res) => {
    res.status(STATUES.CREATED).json({ isSuccess: true });
  });
  app.use(errorHandler);
  return app;
};

const createGlobalApp = () => {
  const app = express();
  app.use('/api', apiMethodMiddleware);
  app.use('/api', (_req, res) => {
    res.status(STATUES.SUCCESS).json({ isSuccess: true });
  });
  app.use(errorHandler);
  return app;
};

const materializePath = (path) => path.replace(/:[^/]+/g, 'test-value');

describe('method middleware', () => {
  test('allows configured HTTP methods', async () => {
    const response = await request(createApp()).post('/users/register');

    expect(response.status).toBe(STATUES.CREATED);
  });

  test.each(['get', 'put', 'patch', 'delete'])(
    'returns 405 and Allow header for %s',
    async (method) => {
      const response = await request(createApp())[method]('/users/register');

      expect(response.status).toBe(STATUES.METHOD_NOT_ALLOWED);
      expect(response.headers.allow).toBe(METHODS.post);
      expect(response.body).toMatchObject({
        isSuccess: false,
        message: 'متد درخواست برای این مسیر مجاز نیست',
      });
    },
  );

  test.each(API_ROUTE_METHODS)(
    'allows every registered method for $path',
    async ({ path, methods }) => {
      const method = methods[0].toLowerCase();
      const response = await request(createGlobalApp())[method](
        `/api${materializePath(path)}`,
      );

      expect(response.status).toBe(STATUES.SUCCESS);
    },
  );

  test.each(API_ROUTE_METHODS)(
    'rejects an unsupported method for $path',
    async ({ path, methods }) => {
      const unsupportedMethod = [
        METHODS.get,
        METHODS.post,
        METHODS.put,
        METHODS.patch,
        METHODS.delete,
      ].find((method) => !methods.includes(method));
      const response = await request(createGlobalApp())[
        unsupportedMethod.toLowerCase()
      ](`/api${materializePath(path)}`);

      expect(response.status).toBe(STATUES.METHOD_NOT_ALLOWED);
      expect(response.headers.allow).toContain(methods[0]);
    },
  );

  test('prefers a static route over an overlapping parameter route', async () => {
    const response = await request(createGlobalApp()).get(
      '/api/users/register',
    );

    expect(response.status).toBe(STATUES.METHOD_NOT_ALLOWED);
    expect(response.headers.allow).toBe(METHODS.post);
  });

  test('allows unknown paths to continue to downstream routing', async () => {
    const response = await request(createGlobalApp()).get('/api/not-defined');

    expect(response.status).toBe(STATUES.SUCCESS);
  });
});
