import { z } from 'zod';

import '#configs/zod.config.js';

import { LANDING_LIMITS } from './landing.constants.js';

const { coerce, object, string } = z;

export const landingSlugSchema = object({
  slug: string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const landingLimitSchema = object({
  limit: coerce
    .number()
    .int()
    .min(1)
    .max(LANDING_LIMITS.MAX_SECTION_ITEMS)
    .optional()
    .default(LANDING_LIMITS.FEATURED_PRODUCTS),
});
