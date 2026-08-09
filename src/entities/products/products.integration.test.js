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
import { CategoryModel } from '#entities/categories/categories.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

import { ProductModel } from './products.model.js';
import productRoutes from './products.route.js';

describe('Product API', () => {
  let app;
  let category;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', productRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await Promise.all([
      ProductModel.deleteMany({}),
      CategoryModel.deleteMany({}),
      PetTypeModel.deleteMany({}),
    ]);
    const petType = await PetTypeModel.create({ title: 'Dog' });
    category = await CategoryModel.create({
      title: 'Food',
      petType: petType._id,
    });
  });

  test('creates, reads, updates, and deletes a product', async () => {
    const created = await request(app).post('/api/products').send({
      title: 'Dry food',
      price: 12.5,
      stock: 10,
      category: category._id.toString(),
    });
    expect(created.status).toBe(STATUES.CREATED);

    const id = created.body.data.id;
    const listed = await request(app).get('/api/products');
    expect(listed.status).toBe(STATUES.SUCCESS);
    expect(listed.body.totalRecords).toBe(1);

    const updated = await request(app)
      .put(`/api/products/${id}`)
      .send({ price: 14 });
    expect(updated.status).toBe(STATUES.SUCCESS);
    expect(updated.body.data.price).toBe(14);

    const deleted = await request(app).delete(`/api/products/${id}`);
    expect(deleted.status).toBe(STATUES.SUCCESS);
  });

  test('rejects invalid product input', async () => {
    const response = await request(app)
      .post('/api/products')
      .send({ title: 'x' });
    expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
  });
});
