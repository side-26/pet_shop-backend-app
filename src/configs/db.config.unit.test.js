jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    connection: {
      readyState: 0,
      on: jest.fn(),
    },
  },
}));

import mongoose from 'mongoose';

import connectDB, { disconnectDB } from './db.config.js';

describe('MongoDB connection lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.connection.readyState = 0;
  });

  test('returns the connected Mongoose instance', async () => {
    const mongooseInstance = { connection: { host: 'mongodb.test' } };
    mongoose.connect.mockResolvedValue(mongooseInstance);

    await expect(connectDB()).resolves.toBe(mongooseInstance);
    expect(mongoose.connect).toHaveBeenCalledWith(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_shop_db',
    );
  });

  test('disconnects an active MongoDB connection', async () => {
    mongoose.connection.readyState = 1;
    mongoose.disconnect.mockResolvedValue();

    await disconnectDB();

    expect(mongoose.disconnect).toHaveBeenCalledTimes(1);
  });

  test('does not disconnect an already closed MongoDB connection', async () => {
    await disconnectDB();

    expect(mongoose.disconnect).not.toHaveBeenCalled();
  });
});
