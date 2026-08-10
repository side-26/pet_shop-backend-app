import { z } from 'zod';

import { PET_LIMITS } from '#configs/constants.js';
import '#configs/zod.config.js';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const titleSchema = z.string().trim().min(2).max(150);
const imageSchema = z.url().max(2048);
const summarySchema = z.string().trim().max(500).optional();
const descriptionSchema = z.string().trim().min(1).max(5000);
const quantitySchema = z.number().int().min(0);
const priceSchema = z.number().min(0);
const discountPercentageSchema = z
  .number()
  .min(PET_LIMITS.MIN_DISCOUNT_PERCENTAGE)
  .max(PET_LIMITS.MAX_DISCOUNT_PERCENTAGE);
const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const petFields = {
  title: titleSchema,
  mainImage: imageSchema,
  images: z.array(imageSchema).max(PET_LIMITS.MAX_IMAGES),
  mainImageThumbnail: imageSchema,
  summary: summarySchema,
  description: descriptionSchema,
  petType: objectIdSchema,
  breed: objectIdSchema,
  quantity: quantitySchema,
  price: priceSchema,
  discountPercentage: discountPercentageSchema,
  enable: z.boolean(),
  slug: slugSchema,
};

export const createPetZodSchema = z.object({
  ...petFields,
  images: petFields.images.optional().default([]),
  quantity: quantitySchema.optional().default(0),
  price: priceSchema.optional().default(0),
  discountPercentage: discountPercentageSchema.optional().default(0),
});

export const updatePetZodSchema = z.object(petFields).partial();
export const petModelUpdateZodSchema = updatePetZodSchema;
export const petIdSchema = z.object({ id: objectIdSchema });

export const petQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),
  petType: objectIdSchema.optional(),
  breed: objectIdSchema.optional(),
  includeDisabled: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sort: z
    .enum(['title', 'createdAt', 'updatedAt', 'price', 'quantity'])
    .optional()
    .default('createdAt'),
});
