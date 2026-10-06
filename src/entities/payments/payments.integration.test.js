jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'payment-test-id'),
  customAlphabet: jest.fn(() => () => '200000000'),
}));

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

import {
  ORDER_PAYMENT_STATUSES,
  ORDER_RESERVATION_STATES,
  PAYMENT_STATUSES,
  ROLES,
  STATUES,
} from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { UserModel } from '#entities/users/users.model.js';

import { PaymentModel } from './payments.model.js';
import paymentRoutes from './payments.route.js';

describe('Payment API', () => {
  let app;
  let user;
  let order;
  let orderIdentifier = 0;
  const paymentGatewayEnvironment = {
    PAYMENT_GETWAY_URL: process.env.PAYMENT_GETWAY_URL,
    FRONTEND_APP_URL: process.env.FRONTEND_APP_URL,
  };

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
    const identifier = String(++orderIdentifier).padStart(9, '0');
    const document = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      trackingCode: identifier,
      orderNumber: identifier,
      totalPrice: 1000,
      discountPrice: 0,
      shippingPrice: 0,
      items: [],
      paymentStatus: ORDER_PAYMENT_STATUSES.PENDING,
      paymentExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
      inventoryReservationState: ORDER_RESERVATION_STATES.RESERVED,
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
    process.env.PAYMENT_GETWAY_URL = 'http://localhost:3001/pet-shop-app';
    process.env.FRONTEND_APP_URL = 'http://localhost:3000';
    app = express();
    app.use(express.json());
    app.use('/api', paymentRoutes);
    app.use(errorHandler);
  });

  afterAll(() => {
    for (const [name, value] of Object.entries(paymentGatewayEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
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

  test('creates an owned checkout payment and exposes it only to its user', async () => {
    const created = await request(app)
      .post('/api/payments/request')
      .set('Authorization', 'Bearer token')
      .send({ orderId: order._id.toString() });
    expect(created.status).toBe(STATUES.CREATED);
    const payment = await PaymentModel.findById(created.body.data.paymentId);
    expect(payment).toMatchObject({ user: user._id });

    const fetched = await request(app)
      .get(`/api/payments/${created.body.data.paymentId}`)
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
      gatewayUrl: expect.stringMatching(
        /^http:\/\/localhost:3001\/pet-shop-app\/[a-f0-9]{64}$/,
      ),
    });
    const payment = await PaymentModel.findById(response.body.data.paymentId);
    expect(payment).toMatchObject({
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
      checkoutSnapshot: { cart: {}, order: {} },
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
      expiresAt: '2099-01-01T00:00:00.000Z',
      companyName: 'پت شاپ پرشین',
      appUrl: 'http://localhost:3000',
    });

    const missing = await request(app).get(
      `/api/gateway/payments/${'b'.repeat(64)}`,
    );
    expect(missing.status).toBe(STATUES.NOT_FOUND);
  });

  test('expires a pending gateway authority after its expiry time', async () => {
    const authority = 'c'.repeat(64);
    await PaymentModel.create({
      order: order._id,
      user: user._id,
      amount: 950,
      authority,
      status: PAYMENT_STATUSES.PENDING,
      expiresAt: new Date(Date.now() - 1),
    });

    const response = await request(app).get(
      `/api/gateway/payments/${authority}`,
    );

    expect(response.status).toBe(STATUES.EXPIRED);
    expect(response.body).toMatchObject({
      isSuccess: false,
      message: 'مهلت انجام پرداخت منقضی شده است',
    });
    await request(app)
      .get(`/api/gateway/payments/${authority}`)
      .expect(STATUES.EXPIRED);
    await expect(PaymentModel.findOne({ authority })).resolves.toMatchObject({
      status: PAYMENT_STATUSES.FAILED,
    });
  });

  test('does not expose a fulfilled payment authority', async () => {
    const authority = 'e'.repeat(64);
    await PaymentModel.create({
      order: order._id,
      user: user._id,
      amount: 950,
      authority,
      status: PAYMENT_STATUSES.PAID,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });

    await request(app)
      .get(`/api/gateway/payments/${authority}`)
      .expect(STATUES.EXPIRED);
  });

  test('releases a prepared order when management marks its payment as failed', async () => {
    const payment = await PaymentModel.create({
      order: order._id,
      user: user._id,
      amount: 950,
      authority: 'd'.repeat(64),
      status: PAYMENT_STATUSES.PENDING,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });
    global.__PAYMENT_TEST_ROLE__ = ROLES.ADMIN;

    const response = await request(app)
      .patch(`/api/payments/${payment._id}/status`)
      .set('Authorization', 'Bearer token')
      .send({ status: PAYMENT_STATUSES.FAILED });

    expect(response.status).toBe(STATUES.SUCCESS);
    await expect(OrderModel.findById(order._id)).resolves.toMatchObject({
      paymentStatus: ORDER_PAYMENT_STATUSES.FAILED,
      inventoryReservationState: ORDER_RESERVATION_STATES.RELEASED,
    });
  });

  test('rejects malformed data and missing prepared Orders', async () => {
    const malformed = await request(app)
      .post('/api/payments')
      .set('Authorization', 'Bearer token')
      .send({});
    expect(malformed.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const missingOrder = await request(app)
      .post('/api/payments/request')
      .set('Authorization', 'Bearer token')
      .send({ orderId: new mongoose.Types.ObjectId().toString() });
    expect(missingOrder.status).toBe(STATUES.NOT_FOUND);
  });

  test('scopes lists to the user and protects management status updates', async () => {
    await PaymentModel.create({
      ...payload(),
      user: user._id,
      checkoutSnapshot: { cart: {}, order: {} },
    });
    await PaymentModel.create({
      ...payload({ authority: 'FOREIGN-AUTH' }),
      user: new mongoose.Types.ObjectId(),
      order: new mongoose.Types.ObjectId(),
      checkoutSnapshot: { cart: {}, order: {} },
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
      .send({ status: PAYMENT_STATUSES.PAID });
    expect(customerUpdate.status).toBe(STATUES.NO_ACCESS);

    global.__PAYMENT_TEST_ROLE__ = ROLES.ADMIN;
    const update = await request(app)
      .patch(`/api/payments/${payment._id}/status`)
      .set('Authorization', 'Bearer token')
      .send({
        status: PAYMENT_STATUSES.PAID,
        gatewayReferenceId: 'REF-1',
      });
    expect(update.status).toBe(STATUES.SUCCESS);
    expect(update.body.data).toMatchObject({
      status: PAYMENT_STATUSES.PAID,
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
