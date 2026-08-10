// config/arvan.js

import { S3Client } from '@aws-sdk/client-s3';

export const arvanS3 = new S3Client({
  region: 'ir-thr-at1', // use your bucket's actual region
  endpoint: process.env.ARVAN_ENDPOINT,

  credentials: {
    accessKeyId: process.env.ARVAN_ACCESS_KEY,
    secretAccessKey: process.env.ARVAN_SECRET_KEY,
  },

  forcePathStyle: false,
});
