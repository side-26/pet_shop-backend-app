import { z } from 'zod';

import '#configs/zod.config.js';

const mongoObjectIdSchema = z
  .string()
  .min(1)
  .regex(/^[0-9a-fA-F]{24}$/);

// ============================================
// CREATE CATEGORY
// ============================================

export const createCategoryZodSchema = z.object({
  title: z.string().min(2).max(50).trim(),

  petType: mongoObjectIdSchema,

  enable: z.boolean().optional().default(true),
});

// ============================================
// UPDATE CATEGORY
// title + petType are required
// ============================================

export const updateCategoryZodSchema = z.object({
  title: z.string().min(2).max(50).trim(),

  petType: mongoObjectIdSchema,

  enable: z.boolean().optional(),
});

// ============================================
// MODEL UPDATE VALIDATION
// Used internally for enable/disable/update operations
// ============================================

export const categoryModelUpdateZodSchema = createCategoryZodSchema.partial();

// ============================================
// ID PARAM
// ============================================

export const categoryIdSchema = z.object({
  id: mongoObjectIdSchema,
});

// ============================================
// READ ALL QUERY
// No pagination
// ============================================

export const categoryQuerySchema = z.object({
  includeDisabled: z
    .string()
    .optional()
    .transform((value) => value === 'true'),

  petType: mongoObjectIdSchema.optional(),
});

export default {
  createCategoryZodSchema,
  updateCategoryZodSchema,
  categoryModelUpdateZodSchema,
  categoryIdSchema,
  categoryQuerySchema,
};
