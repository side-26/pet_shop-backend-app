jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    void res;
    req.user = {
      userId: '65a4de97aff1fbb38c437952',
      role:
        req.get('x-test-role') ||
        jest.requireActual('#configs/constants.js').ROLES.ADMIN,
    };
    next();
  },
}));

jest.mock('#configs/logger.js', () => ({
  app: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  api: { request: jest.fn() },
}));

import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';

import { ROLES, STATUES, USER_ITEM_TYPES } from '#configs/constants.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { ProductModel } from '#entities/products/products.model.js';
import { UserModel } from '#entities/users/users.model.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import dashboardRoutes from './dashboard.route.js';

describe('Dashboard API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', dashboardRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await Promise.all([
      OrderModel.deleteMany({}),
      UserModel.deleteMany({}),
      ProductModel.deleteMany({}),
      PetModel.deleteMany({}),
    ]);
  });

  test('returns date-scoped admin dashboard metrics', async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const petId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertMany([
      {
        _id: userId,
        firstName: 'Ali',
        lastName: 'Ahmadi',
        phoneNumber: '09121234567',
        password: 'hash',
        role: ROLES.CUSTOMER,
        createdAt: new Date('2026-09-02T10:00:00.000Z'),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        phoneNumber: '09121234568',
        password: 'hash',
        role: ROLES.CUSTOMER,
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
      },
    ]);
    await ProductModel.collection.insertOne({
      _id: productId,
      title: 'Low-stock food',
      mainImage: 'https://example.test/product.webp',
      quantity: 2,
      isEnable: true,
    });
    await PetModel.collection.insertOne({
      _id: petId,
      title: 'Available pet',
      mainImage: 'https://example.test/pet.webp',
      quantity: 10,
      inEnable: true,
    });
    await OrderModel.collection.insertMany([
      {
        _id: new mongoose.Types.ObjectId(),
        user: userId,
        trackingCode: '111111111',
        orderNumber: '123456789',
        deliveryState: 0,
        totalPrice: 500,
        discountPrice: 80,
        shippingPrice: 10,
        items: [
          {
            item: productId,
            itemType: USER_ITEM_TYPES.PRODUCT,
            quantity: 2,
            price: 100,
            discountPercentage: 10,
            title: 'Low-stock food',
            mainImage: 'https://example.test/product.webp',
          },
          {
            item: petId,
            itemType: USER_ITEM_TYPES.PET,
            quantity: 1,
            price: 300,
            discountPercentage: 20,
            title: 'Available pet',
            mainImage: 'https://example.test/pet.webp',
          },
        ],
        createdAt: new Date('2026-09-04T10:00:00.000Z'),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        user: userId,
        trackingCode: '222222222',
        orderNumber: '987654321',
        deliveryState: 3,
        totalPrice: 100,
        discountPrice: 0,
        shippingPrice: 0,
        items: [],
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
      },
    ]);

    const response = await request(app).get('/api/dashboard/metrics').query({
      fromDate: '2026-09-01T00:00:00.000Z',
      toDate: '2026-09-05T23:59:59.999Z',
      groupBy: 'day',
      lowStockThreshold: 3,
    });

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.data.summary).toMatchObject({
      orders: 1,
      grossRevenue: 500,
      discountTotal: 80,
      shippingRevenue: 10,
      netRevenue: 430,
      averageOrderValue: 430,
      unitsSold: 3,
      customers: { total: 2, newInPeriod: 1 },
      catalog: {
        products: { total: 1, enabled: 1, lowStock: 1 },
        pets: { total: 1, enabled: 1, lowStock: 0 },
      },
    });
    expect(response.body.data.ordersByDeliveryState).toEqual([
      { deliveryState: 0, count: 1 },
      { deliveryState: 1, count: 0 },
      { deliveryState: 2, count: 0 },
      { deliveryState: 3, count: 0 },
    ]);
    expect(response.body.data.salesTrend).toEqual([
      { period: '2026-09-04', orders: 1, revenue: 430, unitsSold: 3 },
    ]);
    expect(response.body.data.topSellingItems[0]).toMatchObject({
      itemType: USER_ITEM_TYPES.PRODUCT,
      title: 'Low-stock food',
      unitsSold: 2,
      revenue: 180,
    });
    expect(response.body.data.lowStockItems).toEqual([
      expect.objectContaining({
        itemType: USER_ITEM_TYPES.PRODUCT,
        title: 'Low-stock food',
        quantity: 2,
      }),
    ]);
    expect(response.body.data.recentOrders[0]).toMatchObject({
      orderNumber: '123456789',
      user: { phoneNumber: '09121234567' },
    });
  });

  test('rejects non-admin roles and invalid date ranges', async () => {
    const forbidden = await request(app)
      .get('/api/dashboard/metrics')
      .set('x-test-role', ROLES.SELLER);
    expect(forbidden.status).toBe(STATUES.NO_ACCESS);

    const invalidRange = await request(app)
      .get('/api/dashboard/metrics')
      .query({
        fromDate: '2026-09-05T00:00:00.000Z',
        toDate: '2026-09-01T00:00:00.000Z',
      });
    expect(invalidRange.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(invalidRange.body.data.messages).toContainEqual(
      expect.objectContaining({
        field: 'fromDate',
        value: 'تاریخ شروع نباید بعد از تاریخ پایان باشد',
      }),
    );
  });
});
