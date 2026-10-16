import { Queue } from 'bullmq';
import { redisConnection } from '../redis.connection.js';

export const cacheWriteQueue = new Queue('cache-write', {
  connection: redisConnection,
});
