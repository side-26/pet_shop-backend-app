jest.mock('nanoid', () => {
  let value = 200000000;
  return {
    nanoid: jest.fn(() => String(value++)),
    customAlphabet: jest.fn(() => () => String(value++)),
  };
});

jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    if (global.__ORDER_TEST_UNAUTHENTICATED__) {
      return res.status(401).json({ isSuccess: false });
    }
    req.user = {
      userId: global.__ORDER_TEST_USER_ID__,
      role: global.__ORDER_TEST_ROLE__,
    };
    next();
  },
}));

jest.mock('#middlewares/role.middleware.js', () => ({
  roleMiddleware: (allowedRoles) => (req, res, next) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ isSuccess: false });
    }
    next();
  },
}));

jest.mock('#configs/logger.js', () => ({
  app: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  api: { request: jest.fn() },
}));

import bcrypt from 'bcryptjs';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';

import { ROLES, STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { ProductModel } from '#entities/products/products.model.js';
import { UserModel } from '#entities/users/users.model.js';

import { OrderModel } from './orders.model.js';
import orderRoutes from './orders.route.js';

describe('Order API', () => {
  let app;
  let user;

  const address = {
    province: 'Tehran',
    city: 'Tehran',
    detailAddress: 'Original delivery address',
    plate: '12',
    unit: '3',
    postalCode: '1234567890',
    receiverIsMe: false,
    firstName: 'Ali',
    lastName: 'Ahmadi',
    nationalCode: '1234567890',
    phoneNumber: '09121234567',
  };

  const createUser = async (phoneNumber) =>
    UserModel.create({
      firstName: 'Order',
      lastName: 'User',
      phoneNumber,
      password: await bcrypt.hash('password123', 12),
      role: ROLES.CUSTOMER,
      addresses: [address],
    });

  const createCatalogItem = async (Model, slug, overrides = {}) => {
    const item = {
      _id: new mongoose.Types.ObjectId(),
      title: slug,
      mainImage: 'https://example.test/main.webp',
      mainImageThumbnail: 'https://example.test/thumb.webp',
      images: [],
      description: 'description',
      quantity: 10,
      price: 100,
      discountPercentage: 10,
      isEnable: true,
      inEnable: true,
      slug,
      category: new mongoose.Types.ObjectId(),
      petType: new mongoose.Types.ObjectId(),
      breed: new mongoose.Types.ObjectId(),
      ...overrides,
    };
    await Model.collection.insertOne(item);
    return item;
  };

  const prepareCart = async (entries) => {
    const currentUser = await UserModel.findById(user._id);
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'cart.items': entries.map(({ item, itemType, quantity }) => ({
            item: item._id,
            itemType,
            quantity,
          })),
          'cart.userAddress': currentUser.addresses[0]._id,
          'cart.deliveringDateToShipping': new Date('2026-09-01'),
          'cart.shippingPrice': 50,
          'cart.paymentType': 1,
        },
      },
    );
  };

  const createOrder = async () =>
    request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer token')
      .send({ paymentTrackingId: 'PAYMENT-123' });

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', orderRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await Promise.all([
      OrderModel.deleteMany({}),
      UserModel.deleteMany({}),
      ProductModel.deleteMany({}),
      PetModel.deleteMany({}),
    ]);
    user = await createUser('09123456789');
    global.__ORDER_TEST_USER_ID__ = user._id.toString();
    global.__ORDER_TEST_ROLE__ = ROLES.CUSTOMER;
    global.__ORDER_TEST_UNAUTHENTICATED__ = false;
  });

  test('creates a mixed immutable snapshot with independent numeric IDs and clears Cart', async () => {
    const product = await createCatalogItem(ProductModel, 'order-product');
    const pet = await createCatalogItem(PetModel, 'order-pet', {
      price: 200,
      discountPercentage: 20,
    });
    await prepareCart([
      { item: product, itemType: 'product', quantity: 2 },
      { item: pet, itemType: 'pet', quantity: 3 },
    ]);

    const response = await createOrder();
    expect(response.status).toBe(STATUES.CREATED);
    expect(response.body.data).toMatchObject({
      totalPrice: 800,
      discountPrice: 140,
      shippingPrice: 50,
      paymentType: 1,
      deliveryState: 0,
      paymentTrackingId: 'PAYMENT-123',
    });
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.trackingCode).toMatch(/^\d{9}$/);
    expect(response.body.data.orderNumber).toMatch(/^\d{9}$/);
    expect(response.body.data.trackingCode).not.toBe(
      response.body.data.orderNumber,
    );
    const clearedUser = await UserModel.findById(user._id);
    expect(clearedUser.cart.items).toHaveLength(0);
    expect(clearedUser.cart.totalPrice).toBe(0);
  });

  test('historical item pricing and address survive source changes', async () => {
    const product = await createCatalogItem(ProductModel, 'historical');
    await prepareCart([{ item: product, itemType: 'product', quantity: 2 }]);
    const created = await createOrder();
    const orderId = created.body.data._id;

    await ProductModel.collection.updateOne(
      { _id: product._id },
      { $set: { price: 999, discountPercentage: 50 } },
    );
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { 'addresses.0.detailAddress': 'Changed address' } },
    );
    const response = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', 'Bearer token');
    expect(response.body.data.items[0]).toMatchObject({
      price: 100,
      discountPercentage: 10,
    });
    expect(response.body.data.userAddress.detailAddress).toBe(
      'Original delivery address',
    );
  });

  test('rejects empty Cart and missing paymentTrackingId without clearing Cart', async () => {
    const missingPayment = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer token')
      .send({});
    expect(missingPayment.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const empty = await createOrder();
    expect(empty.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(await OrderModel.countDocuments()).toBe(0);
  });

  test('user cannot read another user Order', async () => {
    const product = await createCatalogItem(ProductModel, 'private-order');
    await prepareCart([{ item: product, itemType: 'product', quantity: 1 }]);
    const created = await createOrder();
    const otherUser = await createUser('09111111111');
    global.__ORDER_TEST_USER_ID__ = otherUser._id.toString();
    const response = await request(app)
      .get(`/api/orders/${created.body.data._id}`)
      .set('Authorization', 'Bearer token');
    expect(response.status).toBe(STATUES.NOT_FOUND);
  });

  test('user list is paginated and scoped to authenticated user', async () => {
    const product = await createCatalogItem(ProductModel, 'list-order');
    await prepareCart([{ item: product, itemType: 'product', quantity: 1 }]);
    await createOrder();
    await OrderModel.create({
      ...(await OrderModel.findOne()).toObject(),
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      orderNumber: '123456789',
      trackingCode: '987654321',
    });
    const response = await request(app)
      .get('/api/orders?page=1&limit=10')
      .set('Authorization', 'Bearer token');
    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination.totalItems).toBe(1);
  });

  test.each([ROLES.ADMIN, ROLES.SELLER])(
    '%s can list Orders and update delivery/shipping',
    async (role) => {
      const product = await createCatalogItem(ProductModel, `manage-${role}`);
      await prepareCart([{ item: product, itemType: 'product', quantity: 1 }]);
      const created = await createOrder();
      global.__ORDER_TEST_ROLE__ = role;

      const list = await request(app)
        .get('/api/orders/all')
        .set('Authorization', 'Bearer token');
      expect(list.status).toBe(STATUES.SUCCESS);
      expect(list.body.pagination.totalItems).toBe(1);

      const state = await request(app)
        .patch(`/api/orders/${created.body.data._id}/delivery-state`)
        .set('Authorization', 'Bearer token')
        .send({ deliveryState: 3 });
      expect(state.body.data.deliveryState).toBe(3);

      const shipping = await request(app)
        .patch(`/api/orders/${created.body.data._id}/shipping-info`)
        .set('Authorization', 'Bearer token')
        .send({ name: 'Provider', trackingCode: 'SHIP-1' });
      expect(shipping.body.data.shippingInfo).toMatchObject({
        name: 'Provider',
        trackingCode: 'SHIP-1',
      });
    },
  );

  test('customer cannot access management operations and invalid state is rejected', async () => {
    const id = new mongoose.Types.ObjectId();
    const forbidden = await request(app)
      .get('/api/orders/all')
      .set('Authorization', 'Bearer token');
    expect(forbidden.status).toBe(STATUES.NO_ACCESS);

    global.__ORDER_TEST_ROLE__ = ROLES.ADMIN;
    const invalid = await request(app)
      .patch(`/api/orders/${id}/delivery-state`)
      .set('Authorization', 'Bearer token')
      .send({ deliveryState: 4 });
    expect(invalid.status).toBe(STATUES.BAD_FORM_VALIDATION);

    const invalidShipping = await request(app)
      .patch(`/api/orders/${id}/shipping-info`)
      .set('Authorization', 'Bearer token')
      .send({});
    expect(invalidShipping.status).toBe(STATUES.BAD_FORM_VALIDATION);
  });

  test('all Order routes require authentication', async () => {
    global.__ORDER_TEST_UNAUTHENTICATED__ = true;
    const response = await request(app).get('/api/orders');
    expect(response.status).toBe(STATUES.UN_AUTHORIZED);
  });
});
