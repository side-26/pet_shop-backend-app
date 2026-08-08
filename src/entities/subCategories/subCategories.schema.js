import { z } from 'zod';

import '#configs/zod.config.js';

const mongoObjectIdSchema = z
  .string()
  .min(1)
  .regex(/^[0-9a-fA-F]{24}$/);

// ============================================
// CREATE
// ============================================

export const createSubCategoryZodSchema = z.object({
  title: z.string().min(2).max(50).trim(),

  category: mongoObjectIdSchema,
});

// ============================================
// UPDATE
// ============================================

export const updateSubCategoryZodSchema = z.object({
  title: z.string().min(2).max(50).trim(),

  category: mongoObjectIdSchema,
});

// ============================================
// MODEL UPDATE
// ============================================

export const subCategoryModelUpdateZodSchema =
  createSubCategoryZodSchema.partial();

// ============================================
// ID PARAM
// ============================================

export const subCategoryIdSchema = z.object({
  id: mongoObjectIdSchema,
});

// ============================================
// QUERY
// ============================================

export const subCategoryQuerySchema = z.object({
  category: mongoObjectIdSchema.optional(),
});

export default {
  createSubCategoryZodSchema,
  updateSubCategoryZodSchema,
  subCategoryModelUpdateZodSchema,
  subCategoryIdSchema,
  subCategoryQuerySchema,
};
