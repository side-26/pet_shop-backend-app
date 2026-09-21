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

import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';

import { UserModel } from '#entities/users/users.model.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import profileRoutes from './profile.route.js';

describe('Profile API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use('/api', profileRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
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
      },
    });
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
});
