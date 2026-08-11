import { z } from 'zod';

import '#configs/zod.config.js';

const { coerce, object } = z;

const provinceIdSchema = coerce.number().int().positive();

export const getCitiesByProvinceIdSchema = object({
  provinceId: provinceIdSchema,
});
