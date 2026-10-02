jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    if (global.__PAYMENT_TEST_UNAUTHENTICATED__)
      return res.status(401).json({ isSuccess: false });
    req.user = {
      userId: global.__PAYMENT_TEST_USER_ID__,
      role: global.__PAYMENT_TEST_ROLE__,
    };
    next();
  },
}));

jest.mock('#middlewares/role.middleware.js', () => ({
  roleMiddleware: (allowedRoles) => (req, res, next) => {
    if (!allowedRoles.includes(req.user.role))
      return res.status(403).json({ isSuccess: false });
    next();
  },
}));

import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';

import { PAYMENT_STATUSES, ROLES, STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { UserModel } from '#entities/users/users.model.js';

import { PaymentModel } from './payments.model.js';
import paymentRoutes from './payments.route.js';

describe('Payment API', () => {
  let app;
  let user;
  let order;

  const createUser = async (phoneNumber) =>
    UserModel.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      firstName: 'Payment',
      lastName: 'User',
      phoneNumber,
      password: 'hash',
      role: ROLES.CUSTOMER,
    });

  const createOrder = async (userId) => {
    const document = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      totalPrice: 1000,
      discountPrice: 0,
      shippingPrice: 0,
    };
    await OrderModel.collection.insertOne(document);
    return document;
  };

  const payload = (overrides = {}) => ({
    order: order._id.toString(),
    amount: 1000,
    authority: `AUTH-${new mongoose.Types.ObjectId()}`,
    expiresAt: '2099-01-01T00:00:00.000Z',
    ...overrides,
  });

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', paymentRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await Promise.all([
      PaymentModel.deleteMany({}),
      OrderModel.deleteMany({}),
      UserModel.deleteMany({}),
    ]);
    const inserted = await createUser('09123456789');
    user = { _id: inserted.insertedId };
    order = await createOrder(user._id);
    global.__PAYMENT_TEST_USER_ID__ = user._id.toString();
    global.__PAYMENT_TEST_ROLE__ = ROLES.CUSTOMER;
    global.__PAYMENT_TEST_UNAUTHENTICATED__ = false;
  });

  test('creates an owned pending payment and exposes it only to its user', async () => {
    const created = await request(app)
      .post('/api/payments')
      .set('Authorization', 'Bearer token')
      .send(payload());
    expect(created.status).toBe(STATUES.CREATED);
    expect(created.body.data).toMatchObject({
      order: order._id.toString(),
      user: user._id.toString(),
      status: PAYMENT_STATUSES.PENDING,
    });

    const fetched = await request(app)
      .get(`/api/payments/${created.body.data._id}`)
      .set('Authorization', 'Bearer token');
    expect(fetched.status).toBe(STATUES.SUCCESS);
    expect(fetched.body.data.authority).toBe(created.body.data.authority);
  });

  test('creates a trusted gateway payment request from orderId only', async () => {
    const response = await request(app)
      .post('/api/payments/request')
      .set('Authorization', 'Bearer token')
      .send({ orderId: order._id.toString() });

    expect(response.status).toBe(STATUES.CREATED);
    expect(response.body.data).toMatchObject({
      paymentId: expect.any(String),
      authority: expect.stringMatching(/^[a-f0-9]{64}$/),
      gatewayUrl: expect.stringContaining(
        'http://localhost:3001/pet-shop-app?authority=',
      ),
    });
    const payment = await PaymentModel.findById(response.body.data.paymentId);
    expect(payment).toMatchObject({
      order: order._id,
      user: user._id,
      amount: 1000,
      status: PAYMENT_STATUSES.PENDING,
    });
  });

  test('returns gateway-safe payment information without authentication', async () => {
    const authority = 'a'.repeat(64);
    await PaymentModel.create({
      order: order._id,
      user: user._id,
      amount: 950,
      authority,
      status: PAYMENT_STATUSES.PENDING,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });

    const response = await request(app).get(
      `/api/gateway/payments/${authority}`,
    );
    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data).toEqual({
      status: PAYMENT_STATUSES.PENDING,
      finalPrice: 950,
      companyName: 'پت شاپ پرشین',
      appUrl: 'http://localhost:3000',
    });

    const missing = await request(app).get(
      `/api/gateway/payments/${'b'.repeat(64)}`,
    );
    expect(missing.status).toBe(STATUES.NOT_FOUND);
  });

  test('rejects malformed data, missing orders, and orders belonging to another user', async () => {
    const malformed = await request(app)
      .post('/api/payments')
      .set('Authorization', 'Bearer token')
      .send({});
    expect(malformed.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const missing = await request(app)
      .post('/api/payments')
      .set('Authorization', 'Bearer token')
      .send(payload({ order: new mongoose.Types.ObjectId().toString() }));
    expect(missing.status).toBe(STATUES.NOT_FOUND);

    const foreignOrder = await createOrder(new mongoose.Types.ObjectId());
    const forbidden = await request(app)
      .post('/api/payments')
      .set('Authorization', 'Bearer token')
      .send(payload({ order: foreignOrder._id.toString() }));
    expect(forbidden.status).toBe(STATUES.NO_ACCESS);
  });

  test('scopes lists to the user and protects management status updates', async () => {
    await PaymentModel.create({ ...payload(), user: user._id });
    await PaymentModel.create({
      ...payload({ authority: 'FOREIGN-AUTH' }),
      user: new mongoose.Types.ObjectId(),
      order: new mongoose.Types.ObjectId(),
    });
    const list = await request(app)
      .get('/api/payments')
      .set('Authorization', 'Bearer token');
    expect(list.status).toBe(STATUES.SUCCESS);
    expect(list.body.data).toHaveLength(1);

    const payment = await PaymentModel.findOne({ user: user._id });
    const customerUpdate = await request(app)
      .patch(`/api/payments/${payment._id}/status`)
      .set('Authorization', 'Bearer token')
      .send({ status: PAYMENT_STATUSES.COMPLETED });
    expect(customerUpdate.status).toBe(STATUES.NO_ACCESS);

    global.__PAYMENT_TEST_ROLE__ = ROLES.ADMIN;
    const update = await request(app)
      .patch(`/api/payments/${payment._id}/status`)
      .set('Authorization', 'Bearer token')
      .send({
        status: PAYMENT_STATUSES.COMPLETED,
        gatewayReferenceId: 'REF-1',
      });
    expect(update.status).toBe(STATUES.SUCCESS);
    expect(update.body.data).toMatchObject({
      status: PAYMENT_STATUSES.COMPLETED,
      gatewayReferenceId: 'REF-1',
    });
    expect(update.body.data.paidAt).toBeTruthy();

    const all = await request(app)
      .get('/api/payments/all')
      .set('Authorization', 'Bearer token');
    expect(all.status).toBe(STATUES.SUCCESS);
    expect(all.body.data).toHaveLength(2);
  });

  test('requires authentication for payment routes', async () => {
    global.__PAYMENT_TEST_UNAUTHENTICATED__ = true;
    const response = await request(app).get('/api/payments');
    expect(response.status).toBe(STATUES.UN_AUTHORIZED);
  });
});
