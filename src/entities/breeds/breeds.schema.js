import { z } from 'zod';

import { BREED_LEVELS } from '#configs/constants.js';
import '#configs/zod.config.js';

const breedLevelSchema = z
  .number()
  .int()
  .refine((value) => BREED_LEVELS.includes(value));

const mongoObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const createBreedZodSchema = z.object({
  title: z.string().trim().min(2).max(100),
  petType: mongoObjectIdSchema,
  country: z.string().trim().min(2).max(100).nullable(),
  ageAverage: z.string().trim().min(1).max(50),
  size: breedLevelSchema,
  activityLevel: breedLevelSchema.nullable(),
  enable: z.boolean(),
});

export const updateBreedZodSchema = createBreedZodSchema;
export const breedModelUpdateZodSchema = createBreedZodSchema.partial();
export const breedIdSchema = z.object({ id: mongoObjectIdSchema });

export const breedQuerySchema = z.object({
  petType: mongoObjectIdSchema.optional(),
  includeDisabled: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  search: z.string().trim().max(100).optional(),
  page: z
    .string()
    .optional()
    .transform((value) => Number.parseInt(value, 10) || 1),
  limit: z
    .string()
    .optional()
    .transform((value) => Number.parseInt(value, 10) || 10),
  sort: z.enum(['title', 'createdAt', 'updatedAt']).optional().default('title'),
});
