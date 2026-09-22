jest.mock('nanoid', () => ({
  customAlphabet: jest.fn(() => () => '123456789'),
  nanoid: jest.fn(() => 'test-id'),
}));

jest.mock('../../infrastructure/redis/auth/redisAuthSession.store.js', () => ({
  RedisAuthSessionStore: jest.fn(() => ({
    deleteByUserId: jest.fn().mockResolvedValue(),
    isOwnedBy: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    void res;
    if (!global.__PROFILE_TEST_USER_ID__) {
      return res.status(401).json({ isSuccess: false });
    }
    req.user = {
      userId: global.__PROFILE_TEST_USER_ID__,
      role: global.__PROFILE_TEST_USER_ROLE__ || 'customer',
    };
    next();
  },
}));

jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    deleteObject: jest.fn().mockResolvedValue(),
    getObjectKeyFromUrl: jest.fn((url) =>
      url.replace('https://cdn.example.test/', ''),
    ),
  },
}));

import bcrypt from 'bcryptjs';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';

import { UserModel } from '#entities/users/users.model.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import { ObjectStorageService } from '#services/objectStorage.service.js';

import profileRoutes from './profile.route.js';

describe('Profile API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', profileRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await Promise.all([UserModel.deleteMany({}), OrderModel.deleteMany({})]);
    global.__PROFILE_TEST_USER_ID__ = undefined;
    global.__PROFILE_TEST_USER_ROLE__ = undefined;
  });

  test('returns the authenticated customer personal information', async () => {
    const userId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: userId,
      firstName: 'علی',
      lastName: 'احمدی',
      phoneNumber: '09121234567',
      email: 'ali@example.test',
      avatar: 'https://cdn.example.test/avatars/ali.webp',
      nationalCode: '0012345678',
      age: 30,
      birthDate: new Date('1996-07-14T00:00:00.000Z'),
      password: 'hash',
      isEnable: true,
    });
    global.__PROFILE_TEST_USER_ID__ = userId.toString();

    const response = await request(app).get('/api/profile/account').expect(200);

    expect(response.body).toEqual({
      isSuccess: true,
      data: {
        userId: userId.toString(),
        firstName: 'علی',
        lastName: 'احمدی',
        phoneNumber: '09121234567',
        email: 'ali@example.test',
        avatar: 'https://cdn.example.test/avatars/ali.webp',
        nationalCode: '0012345678',
        age: 30,
        birthDate: '1996-07-14T00:00:00.000Z',
      },
    });
  });

  test('deletes only the authenticated customer current avatar', async () => {
    const userId = new mongoose.Types.ObjectId();
    const avatar = `https://cdn.example.test/users/${userId}/avatar/current.webp`;
    await UserModel.collection.insertOne({
      _id: userId,
      phoneNumber: '09121234567',
      password: 'hash',
      avatar,
      isEnable: true,
    });
    global.__PROFILE_TEST_USER_ID__ = userId.toString();

    const response = await request(app)
      .delete('/api/profile/avatar')
      .expect(200);

    expect(response.body).toMatchObject({
      isSuccess: true,
      data: { avatar: '' },
    });
    expect((await UserModel.findById(userId)).avatar).toBe('');
    expect(ObjectStorageService.deleteObject).toHaveBeenCalledWith(
      `users/${userId}/avatar/current.webp`,
    );
  });

  test('returns 401 when the authenticated account is disabled', async () => {
    const userId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: userId,
      phoneNumber: '09121234567',
      password: 'hash',
      isEnable: false,
    });
    global.__PROFILE_TEST_USER_ID__ = userId.toString();

    const response = await request(app).get('/api/profile/account').expect(401);

    expect(response.body).toMatchObject({
      isSuccess: false,
      message: 'حساب کاربری غیرفعال است یا حذف شده است',
    });
  });

  test('rejects a non-customer role', async () => {
    global.__PROFILE_TEST_USER_ID__ = new mongoose.Types.ObjectId().toString();
    global.__PROFILE_TEST_USER_ROLE__ = 'admin';

    const response = await request(app).get('/api/profile/account').expect(403);

    expect(response.body).toMatchObject({
      isSuccess: false,
      message: 'شما اجازه دسترسی به این بخش را ندارید',
    });
  });

  test('lists, reads, and updates only the authenticated customer addresses', async () => {
    const userId = new mongoose.Types.ObjectId();
    const addressId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: userId,
      phoneNumber: '09121234567',
      password: 'hash',
      isEnable: true,
      addresses: [
        {
          _id: addressId,
          province: 'تهران',
          city: 'تهران',
          detailAddress: 'خیابان آزادی پلاک دوازده',
          plate: '12',
          unit: null,
          postalCode: '1234567890',
          receiverIsMe: false,
          firstName: 'علی',
          lastName: 'احمدی',
          nationalCode: '0012345678',
          phoneNumber: '09121234567',
        },
      ],
    });
    global.__PROFILE_TEST_USER_ID__ = userId.toString();

    const list = await request(app).get('/api/profile/addresses').expect(200);
    expect(list.body.totalRecords).toBe(1);
    expect(list.body.data[0]._id).toBe(addressId.toString());

    const detail = await request(app)
      .get(`/api/profile/addresses/${addressId}`)
      .expect(200);
    expect(detail.body.data).toMatchObject({
      _id: addressId.toString(),
      plate: '12',
    });

    const updated = await request(app)
      .patch(`/api/profile/addresses/${addressId}`)
      .send({ plate: '25' })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      _id: addressId.toString(),
      plate: '25',
    });

    await request(app)
      .get(`/api/profile/addresses/${new mongoose.Types.ObjectId()}`)
      .expect(404);
  });

  test('creates and deletes an authenticated customer address', async () => {
    const userId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: userId,
      phoneNumber: '09121234567',
      password: 'hash',
      isEnable: true,
      addresses: [],
    });
    global.__PROFILE_TEST_USER_ID__ = userId.toString();
    const address = {
      province: 'تهران',
      city: 'تهران',
      detailAddress: 'خیابان آزادی پلاک دوازده',
      plate: '12',
      postalCode: '1234567890',
      receiverIsMe: false,
      firstName: 'علی',
      lastName: 'احمدی',
      nationalCode: '0012345678',
      phoneNumber: '09121234567',
    };

    const created = await request(app)
      .post('/api/profile/addresses')
      .send(address)
      .expect(201);
    expect(created.body.data).toMatchObject(address);

    await request(app)
      .delete(`/api/profile/addresses/${created.body.data._id}`)
      .expect(200);
    const user = await UserModel.findById(userId);
    expect(user.addresses).toHaveLength(0);
  });

  test('lists and reads only the authenticated customer order snapshots', async () => {
    const userId = new mongoose.Types.ObjectId();
    const otherUserId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();
    const otherOrderId = new mongoose.Types.ObjectId();
    await Promise.all([
      UserModel.collection.insertOne({
        _id: userId,
        phoneNumber: '09121234567',
        password: 'hash',
        isEnable: true,
      }),
      OrderModel.collection.insertMany([
        {
          _id: orderId,
          user: userId,
          orderNumber: '123456789',
          trackingCode: '111111111',
        },
        {
          _id: otherOrderId,
          user: otherUserId,
          orderNumber: '987654321',
          trackingCode: '222222222',
        },
      ]),
    ]);
    global.__PROFILE_TEST_USER_ID__ = userId.toString();

    const list = await request(app).get('/api/profile/orders').expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]._id).toBe(orderId.toString());

    const detail = await request(app)
      .get(`/api/profile/orders/${orderId}`)
      .expect(200);
    expect(detail.body.data._id).toBe(orderId.toString());

    await request(app).get(`/api/profile/orders/${otherOrderId}`).expect(404);
  });

  test('resets the authenticated customer password and invalidates sessions', async () => {
    const userId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: userId,
      phoneNumber: '09121234567',
      password: await bcrypt.hash('old-password', 4),
      isEnable: true,
    });
    global.__PROFILE_TEST_USER_ID__ = userId.toString();

    const response = await request(app)
      .post('/api/profile/reset-password')
      .send({
        oldPassword: 'old-password',
        password: 'new-password',
        repeatPassword: 'new-password',
      })
      .expect(200);

    expect(response.body.message).toBe('کلمه عبور با موفقیت بازنشانی شد');
    const updatedUser = await UserModel.findById(userId).select('+password');
    await expect(
      bcrypt.compare('new-password', updatedUser.password),
    ).resolves.toBe(true);
  });
});
