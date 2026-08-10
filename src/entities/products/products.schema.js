import { z } from 'zod';

import { PRODUCT_LIMITS } from '#configs/constants.js';
import '#configs/zod.config.js';

const {
  array,
  boolean,
  coerce,
  enum: enumValue,
  number,
  object,
  string,
  url,
} = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);
const titleSchema = string().trim().min(2).max(150);
const imageSchema = url().max(2048);
const summarySchema = string().trim().max(500).optional();
const descriptionSchema = string().trim().min(1).max(5000);
const quantitySchema = number().int().min(0);
const priceSchema = number().min(0);
const discountPercentageSchema = number()
  .min(PRODUCT_LIMITS.MIN_DISCOUNT_PERCENTAGE)
  .max(PRODUCT_LIMITS.MAX_DISCOUNT_PERCENTAGE);
const slugSchema = string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const productFields = {
  title: titleSchema,
  mainImage: imageSchema,
  images: array(imageSchema).max(PRODUCT_LIMITS.MAX_IMAGES),
  mainImageThumbnail: imageSchema,
  summary: summarySchema,
  description: descriptionSchema,
  category: objectIdSchema,
  subCategory: objectIdSchema.nullable(),
  quantity: quantitySchema,
  price: priceSchema,
  discountPercentage: discountPercentageSchema,
  enable: boolean(),
  slug: slugSchema,
};

export const createProductZodSchema = object({
  ...productFields,
  images: productFields.images.optional().default([]),
  subCategory: productFields.subCategory.optional(),
  quantity: quantitySchema.optional().default(0),
  price: priceSchema.optional().default(0),
  discountPercentage: discountPercentageSchema.optional().default(0),
});

export const updateProductZodSchema = object(productFields).partial();
export const productModelUpdateZodSchema = updateProductZodSchema;
export const productIdSchema = object({ id: objectIdSchema });

export const productQuerySchema = object({
  search: string().trim().max(150).optional(),
  category: objectIdSchema.optional(),
  subCategory: objectIdSchema.optional(),
  includeDisabled: string()
    .optional()
    .transform((value) => value === 'true'),
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce.number().int().min(1).max(100).optional().default(10),
  sort: enumValue(['title', 'createdAt', 'updatedAt', 'price', 'quantity'])
    .optional()
    .default('createdAt'),
});
