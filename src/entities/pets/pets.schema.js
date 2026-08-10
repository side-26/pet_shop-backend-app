import { z } from 'zod';

import { PET_LIMITS } from '#configs/constants.js';
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
  .min(PET_LIMITS.MIN_DISCOUNT_PERCENTAGE)
  .max(PET_LIMITS.MAX_DISCOUNT_PERCENTAGE);
const slugSchema = string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const petFields = {
  title: titleSchema,
  mainImage: imageSchema,
  images: array(imageSchema).max(PET_LIMITS.MAX_IMAGES),
  mainImageThumbnail: imageSchema,
  summary: summarySchema,
  description: descriptionSchema,
  petType: objectIdSchema,
  breed: objectIdSchema,
  quantity: quantitySchema,
  price: priceSchema,
  discountPercentage: discountPercentageSchema,
  enable: boolean(),
  slug: slugSchema,
};

export const createPetZodSchema = object({
  ...petFields,
  images: petFields.images.optional().default([]),
  quantity: quantitySchema.optional().default(0),
  price: priceSchema.optional().default(0),
  discountPercentage: discountPercentageSchema.optional().default(0),
});

export const updatePetZodSchema = object(petFields).partial();
export const petModelUpdateZodSchema = updatePetZodSchema;
export const petIdSchema = object({ id: objectIdSchema });

export const petQuerySchema = object({
  search: string().trim().max(150).optional(),
  petType: objectIdSchema.optional(),
  breed: objectIdSchema.optional(),
  includeDisabled: string()
    .optional()
    .transform((value) => value === 'true'),
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce.number().int().min(1).max(100).optional().default(10),
  sort: enumValue(['title', 'createdAt', 'updatedAt', 'price', 'quantity'])
    .optional()
    .default('createdAt'),
});
