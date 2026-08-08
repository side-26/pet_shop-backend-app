import { z } from 'zod';

import '#configs/zod.config.js';

// ============================================
// SHARED
// ============================================

const mongoObjectIdSchema = z
  .string()
  .min(1)
  .regex(/^[0-9a-fA-F]{24}$/);

// ============================================
// CREATE SUB CATEGORY
// title + categoryID are required
// ============================================

export const createSubCategoryZodSchema = z.object({
  title: z.string().min(2).max(50).trim(),

  categoryID: mongoObjectIdSchema,
});

// ============================================
// UPDATE SUB CATEGORY
// title + categoryID are required
// ============================================

export const updateSubCategoryZodSchema = z.object({
  title: z.string().min(2).max(50).trim(),

  categoryID: mongoObjectIdSchema,
});

// ============================================
// MODEL UPDATE VALIDATION
// Used internally by Mongoose findOneAndUpdate
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
// READ ALL QUERY
// Allows filtering by category
// ============================================

export const subCategoryQuerySchema = z.object({
  categoryID: mongoObjectIdSchema.optional(),
});

export default {
  createSubCategoryZodSchema,
  updateSubCategoryZodSchema,
  subCategoryModelUpdateZodSchema,
  subCategoryIdSchema,
  subCategoryQuerySchema,
};
