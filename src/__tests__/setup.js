// src/__tests__/setup.js

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Load environment variables
dotenv.config();

let mongoServer;
let isolatedTestDatabase;

const createIsolatedTestDatabaseUri = (databaseUri) => {
  const parsedUri = new URL(databaseUri);
  const databaseName =
    parsedUri.pathname.replace(/^\/+/, '') || 'pet_shop_test';

  isolatedTestDatabase = `${databaseName}_jest_${process.pid}`;
  parsedUri.pathname = `/${isolatedTestDatabase}`;
  return parsedUri.toString();
};

// Increase global timeout for async hooks
jest.setTimeout(60000);

beforeAll(async () => {
  // External test databases must be transaction-capable replica sets. Keep
  // the default test environment self-contained and transaction-capable.
  if (
    process.env.MONGODB_TEST_URI &&
    process.env.MONGODB_TEST_USE_EXTERNAL === 'true'
  ) {
    const testDatabaseUri = createIsolatedTestDatabaseUri(
      process.env.MONGODB_TEST_URI,
    );
    console.log('🧪 Using isolated test database:', testDatabaseUri);
    await mongoose.connect(testDatabaseUri);
  } else {
    // Otherwise, fallback to in‑memory (will download binary)
    console.warn(
      '⚠️ Using an in-memory MongoDB replica set for transaction-capable tests (may download binary)',
    );
    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
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
  try {
    if (isolatedTestDatabase) {
      await mongoose.connection.dropDatabase();
    }
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
});

// Global helper
global.generateObjectId = () => new mongoose.Types.ObjectId().toString();
