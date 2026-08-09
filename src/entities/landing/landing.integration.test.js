jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    void res;
    req.user = {
      id: '65a4de97aff1fbb38c437952',
      role: jest.requireActual('#configs/constants.js').ROLES.ADMIN,
    };
    next();
  },
}));
jest.mock('#middlewares/role.middleware.js', () => ({
  roleMiddleware: () => (req, res, next) => {
    void req;
    void res;
    next();
  },
}));

import express from 'express';
import request from 'supertest';

import { STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import { LandingModel } from './landing.model.js';
import landingRoutes from './landing.route.js';

describe('Landing API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', landingRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => LandingModel.deleteMany({}));

  test('reads defaults and updates landing configuration', async () => {
    const initial = await request(app).get('/api/landing');
    expect(initial.status).toBe(STATUES.SUCCESS);
    expect(initial.body.data.featuredProductLimit).toBe(8);

    const updated = await request(app).put('/api/landing').send({
      heroTitle: 'Everything your pet needs',
      featuredProductLimit: 6,
    });
    expect(updated.status).toBe(STATUES.SUCCESS);
    expect(updated.body.data.heroTitle).toBe('Everything your pet needs');
  });

  test('rejects invalid landing configuration', async () => {
    const response = await request(app)
      .put('/api/landing')
      .send({ featuredProductLimit: 100 });
    expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
  });
});
