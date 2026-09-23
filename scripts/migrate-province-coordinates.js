import connectDB, { disconnectDB } from '#configs/db.config.js';

import { DEFAULT_PROVINCES } from '../src/integrations/locations/locations.data.js';
import { ProvinceModel } from '../src/integrations/locations/locations.model.js';

try {
  await connectDB();
  await ProvinceModel.bulkWrite(
    DEFAULT_PROVINCES.map(({ provinceId, title, latLng }) => ({
      updateOne: {
        filter: { provinceId },
        update: { $set: { title, latLng } },
        upsert: true,
      },
    })),
  );
  console.log('مختصات مراکز استان‌ها با موفقیت مهاجرت داده شد');
} finally {
  await disconnectDB();
}
