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

import { ORDER_STATUSES, STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import { CategoryModel } from '#entities/categories/categories.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { ProductModel } from '#entities/products/products.model.js';

import { OrderModel } from './orders.model.js';
import orderRoutes from './orders.route.js';

describe('Order API', () => {
  let app;
  let product;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', orderRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await Promise.all([
      OrderModel.deleteMany({}),
      ProductModel.deleteMany({}),
      CategoryModel.deleteMany({}),
      PetTypeModel.deleteMany({}),
    ]);
    const petType = await PetTypeModel.create({ title: 'Bird' });
    const category = await CategoryModel.create({
      title: 'Food',
      petType: petType._id,
    });
    product = await ProductModel.create({
      title: 'Seeds',
      price: 5,
      stock: 10,
      category: category._id,
    });
  });

  test('creates, lists, reads, updates, and deletes an order', async () => {
    const created = await request(app)
      .post('/api/orders')
      .send({
        items: [{ product: product._id.toString(), quantity: 2 }],
        shippingAddress: 'Tehran, example street',
      });
    expect(created.status).toBe(STATUES.CREATED);
    expect(created.body.data.totalAmount).toBe(10);

    const id = created.body.data.id;
    expect((await request(app).get('/api/orders')).status).toBe(
      STATUES.SUCCESS,
    );
    expect((await request(app).get(`/api/orders/${id}`)).status).toBe(
      STATUES.SUCCESS,
    );

    const updated = await request(app)
      .patch(`/api/orders/${id}/status`)
      .send({ status: ORDER_STATUSES.PROCESSING });
    expect(updated.status).toBe(STATUES.SUCCESS);
    expect(updated.body.data.status).toBe(ORDER_STATUSES.PROCESSING);
    expect((await request(app).delete(`/api/orders/${id}`)).status).toBe(
      STATUES.SUCCESS,
    );
  });

  test('rejects an empty order', async () => {
    const response = await request(app).post('/api/orders').send({
      items: [],
      shippingAddress: 'Tehran, example street',
    });
    expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
  });
});
