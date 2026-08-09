import { z } from 'zod';

import '#configs/zod.config.js';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const createProductZodSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().default(''),
  price: z.number().min(0),
  stock: z.number().int().min(0).optional().default(0),
  category: objectIdSchema,
  subCategory: objectIdSchema.optional(),
  images: z.array(z.string().trim().min(1)).max(10).optional().default([]),
  isEnabled: z.boolean().optional().default(true),
});

export const updateProductZodSchema = createProductZodSchema.partial();
export const productIdSchema = z.object({ id: objectIdSchema });
export const productQuerySchema = z.object({
  category: objectIdSchema.optional(),
  subCategory: objectIdSchema.optional(),
  includeDisabled: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});
