import mongoose from 'mongoose';

import logger from '#configs/logger.js';

export default async function connectDB() {
  const mongooseInstance = await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_shop_db',
  );
  console.log('MongoDB connected');

  logger.app.success('اتصال به MongoDB برقرار شد', {
    host: mongooseInstance.connection.host,
  });

  return mongooseInstance;
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.app.info('اتصال MongoDB بسته شد');
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
  logger.app.warn('اتصال MongoDB قطع شد');
});

mongoose.connection.on('error', (error) => {
  logger.app.error('خطای اتصال MongoDB رخ داد', error);
});
