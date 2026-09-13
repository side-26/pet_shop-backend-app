import { z } from 'zod';

import '#configs/zod.config.js';

import {
  LANDING_LIMITS,
  LANDING_PRODUCT_LIST_SORTS,
} from './landing.constants.js';

const {
  array,
  boolean,
  coerce,
  enum: enumValue,
  object,
  preprocess,
  string,
} = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);
const objectIdListSchema = preprocess((value) => {
  if (Array.isArray(value)) return value.flatMap((item) => item.split(','));
  return typeof value === 'string' ? value.split(',') : value;
}, array(objectIdSchema).min(1));
const booleanQuerySchema = preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  boolean(),
);

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
  category: objectIdListSchema.optional(),
  subCategory: objectIdListSchema.optional(),
  brand: objectIdListSchema.optional(),
  priceFrom: coerce.number().min(0).optional(),
  priceTo: coerce.number().min(0).optional(),
  isEnable: booleanQuerySchema.optional(),
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

export const landingPetListQuerySchema = object({
  petType: objectIdListSchema.optional(),
  breed: objectIdListSchema.optional(),
  priceFrom: coerce.number().min(0).optional(),
  priceTo: coerce.number().min(0).optional(),
  isEnable: booleanQuerySchema.optional(),
  sort: enumValue(Object.values(LANDING_PRODUCT_LIST_SORTS))
    .optional()
    .default(LANDING_PRODUCT_LIST_SORTS.MOST_SALES),
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce.number().int().min(1).max(100).optional().default(20),
}).refine(
  ({ priceFrom, priceTo }) =>
    priceFrom === undefined || priceTo === undefined || priceFrom <= priceTo,
  {
    message: 'حداقل قیمت نمی‌تواند بیشتر از حداکثر قیمت باشد',
    path: ['priceFrom'],
  },
);
