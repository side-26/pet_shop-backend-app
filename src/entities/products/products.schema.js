import { z } from 'zod';

import { IMAGE_PROCESSING, PRODUCT_LIMITS } from '#configs/constants.js';
import '#configs/zod.config.js';

const {
  array,
  boolean,
  coerce,
  enum: enumValue,
  object,
  preprocess,
  string,
  url,
} = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);
const titleSchema = string().trim().min(2).max(150);
const imageSchema = url().max(2048);
const thumbnailSchema = string()
  .max(IMAGE_PROCESSING.MAX_THUMBNAIL_SIZE_BYTES - 1)
  .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/);
const imageListSchema = preprocess(
  (value) => (typeof value === 'string' ? [value] : value),
  array(imageSchema).max(PRODUCT_LIMITS.MAX_IMAGES),
);
const summarySchema = string().trim().max(500).optional();
const descriptionSchema = string().trim().min(1).max(5000);
const quantitySchema = coerce.number().int().min(0);
const priceSchema = coerce.number().min(0);
const discountPercentageSchema = coerce
  .number()
  .min(PRODUCT_LIMITS.MIN_DISCOUNT_PERCENTAGE)
  .max(PRODUCT_LIMITS.MAX_DISCOUNT_PERCENTAGE);
const slugSchema = string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const booleanSchema = preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  boolean(),
);

const productFields = {
  title: titleSchema,
  mainImage: imageSchema,
  images: imageListSchema,
  mainImageThumbnail: thumbnailSchema,
  summary: summarySchema,
  description: descriptionSchema,
  category: objectIdSchema,
  subCategory: objectIdSchema.nullable(),
  quantity: quantitySchema,
  price: priceSchema,
  discountPercentage: discountPercentageSchema,
  isEnable: booleanSchema,
  slug: slugSchema,
};

export const productPersistedZodSchema = object({
  ...productFields,
  images: productFields.images.optional().default([]),
  subCategory: productFields.subCategory.optional(),
  quantity: quantitySchema.optional().default(0),
  price: priceSchema.optional().default(0),
  discountPercentage: discountPercentageSchema.optional().default(0),
});

export const createProductZodSchema = object({
  title: titleSchema,
  summary: summarySchema,
  description: descriptionSchema,
  category: objectIdSchema,
  subCategory: objectIdSchema.nullable().optional(),
  quantity: quantitySchema.optional().default(0),
});
export const updateProductZodSchema = object({
  title: titleSchema,
  summary: summarySchema,
  description: descriptionSchema,
  category: objectIdSchema,
  subCategory: objectIdSchema.nullable(),
  quantity: quantitySchema,
})
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'حداقل یک فیلد باید ارسال شود',
  });
export const updateProductImagesZodSchema = object({}).strict();
export const updateProductPriceZodSchema = object({
  price: priceSchema,
  discountPercentage: discountPercentageSchema,
})
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'حداقل یک فیلد باید ارسال شود',
  });
export const productModelUpdateZodSchema = object(productFields).partial();
export const productIdSchema = object({ id: objectIdSchema });

export const productQuerySchema = object({
  title: string().trim().max(150).optional(),
  search: string().trim().max(150).optional(),
  category: objectIdSchema.optional(),
  subCategory: objectIdSchema.optional(),
  quantity: quantitySchema.optional(),
  price: priceSchema.optional(),
  isEnable: booleanSchema.optional(),
  includeDisabled: string()
    .optional()
    .transform((value) => value === 'true'),
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce.number().int().min(1).max(100).optional().default(10),
  sort: enumValue(['title', 'createdAt', 'updatedAt', 'price', 'quantity'])
    .optional()
    .default('createdAt'),
});
