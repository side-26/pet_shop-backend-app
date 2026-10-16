import { z } from 'zod';

import '#configs/zod.config.js';

const { coerce, object, preprocess } = z;

const requiredCoordinate = (minimum, maximum) =>
  preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    coerce.number().min(minimum).max(maximum),
  );

export const reverseGeocodingQuerySchema = object({
  lat: requiredCoordinate(-90, 90),
  lng: requiredCoordinate(-180, 180),
});
