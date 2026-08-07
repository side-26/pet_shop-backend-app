import { z } from 'zod';

import '#configs/zod.config';

// ============================================
// CREATE PET TYPE SCHEMA
// ============================================
export const createPetTypeZodSchema = z.object({
  title: z.string().min(2).max(20).trim(),

  description: z.string().max(150).optional().default(''),

  isEnabled: z.boolean().optional().default(true),
});

// ============================================
// UPDATE PET TYPE SCHEMA (All fields optional)
// ============================================
export const updatePetTypeZodSchema = z.object({
  title: z.string().min(2).max(20).trim().optional(),

  description: z.string().max(150).optional(),

  isEnabled: z.boolean().optional(),
});

// ============================================
// PET TYPE ID SCHEMA (For params validation)
// ============================================
export const petTypeIdSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[0-9a-fA-F]{24}$/),
});

// ============================================
// PET TYPE SLUG SCHEMA (For params validation)
// ============================================
export const petTypeSlugSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

// ============================================
// PET TYPE QUERY SCHEMA (For query params)
// ============================================
export const petTypeQuerySchema = z.object({
  includeDisabled: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  search: z.string().optional().max(50),
  page: z
    .string()
    .optional()
    .transform((val) => parseInt(val) || 1),
  limit: z
    .string()
    .optional()
    .transform((val) => parseInt(val) || 10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ============================================
// BULK PET TYPE SCHEMA (For bulk operations)
// ============================================
export const bulkPetTypeSchema = z.object({
  types: z
    .array(
      z.object({
        title: z.string().min(2).max(20).trim(),
        description: z.string().max(150).optional().default(''),
        isEnabled: z.boolean().optional().default(true),
      }),
    )
    .min(1),
});

// ============================================
// PET TYPE STATUS SCHEMA (For status update)
// ============================================
export const petTypeStatusSchema = z.object({
  isEnabled: z.boolean(),
});

// ============================================
// EXPORT ALL SCHEMAS
// ============================================
export default {
  createPetTypeZodSchema,
  updatePetTypeZodSchema,
  petTypeIdSchema,
  petTypeSlugSchema,
  petTypeQuerySchema,
  bulkPetTypeSchema,
  petTypeStatusSchema,
};
