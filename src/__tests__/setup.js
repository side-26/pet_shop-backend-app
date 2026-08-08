// src/__tests__/setup.js

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Load environment variables
dotenv.config();

let mongoServer;

// Increase global timeout for async hooks
jest.setTimeout(60000);

beforeAll(async () => {
  // If MONGODB_TEST_URI is set, use it (real DB)
  if (process.env.MONGODB_TEST_URI) {
    console.log('🧪 Using real test database:', process.env.MONGODB_TEST_URI);
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  } else {
    // Otherwise, fallback to in‑memory (will download binary)
    console.warn(
      '⚠️ MONGODB_TEST_URI not set, using in-memory MongoDB (may download binary)',
    );
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Global helper
global.generateObjectId = () => new mongoose.Types.ObjectId().toString();
