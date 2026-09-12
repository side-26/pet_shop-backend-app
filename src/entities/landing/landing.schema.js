import { z } from 'zod';

import '#configs/zod.config.js';

import {
  LANDING_LIMITS,
  LANDING_PRODUCT_LIST_SORTS,
} from './landing.constants.js';

const { coerce, enum: enumValue, object, string } = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);

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

export const landingProductListQuerySchema = object({
  category: objectIdSchema.optional(),
  subCategory: objectIdSchema.optional(),
  brand: objectIdSchema.optional(),
  priceFrom: coerce.number().min(0).optional(),
  priceTo: coerce.number().min(0).optional(),
  sort: enumValue(Object.values(LANDING_PRODUCT_LIST_SORTS))
    .optional()
    .default(LANDING_PRODUCT_LIST_SORTS.MOST_SALES),
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce
    .number()
    .int()
    .min(1)
    .max(LANDING_LIMITS.MAX_SECTION_ITEMS)
    .optional()
    .default(LANDING_LIMITS.PRODUCT_LIST_DEFAULT_LIMIT),
}).refine(
  ({ priceFrom, priceTo }) =>
    priceFrom === undefined || priceTo === undefined || priceFrom <= priceTo,
  {
    message: 'حداقل قیمت نمی‌تواند بیشتر از حداکثر قیمت باشد',
    path: ['priceFrom'],
  },
);
