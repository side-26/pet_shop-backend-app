import { z } from 'zod';

import '#configs/zod.config.js';

const propertyDefinitionZodSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(/^[a-z][a-zA-Z0-9]*$/),
    label: z.string().trim().min(1).max(80),
    valueType: z.enum(['string', 'number', 'boolean', 'date', 'enum']),
    required: z.boolean().optional().default(false),
    options: z.array(z.string().trim().min(1)).min(1).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    defaultValue: z.unknown().optional(),
  })
  .superRefine((definition, context) => {
    if (definition.valueType === 'enum' && !definition.options?.length) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Enum properties require at least one option',
      });
    }

    if (
      definition.min !== undefined &&
      definition.max !== undefined &&
      definition.min > definition.max
    ) {
      context.addIssue({
        code: 'custom',
        path: ['min'],
        message: 'Minimum cannot be greater than maximum',
      });
    }
  });

const propertyDefinitionsZodSchema = z
  .array(propertyDefinitionZodSchema)
  .max(50)
  .superRefine((definitions, context) => {
    const seenKeys = new Set();

    definitions.forEach((definition, index) => {
      if (seenKeys.has(definition.key)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: 'Property definition keys must be unique',
        });
      }
      seenKeys.add(definition.key);
    });
  });

// ============================================
// CREATE PET TYPE SCHEMA
// ============================================
export const createPetTypeZodSchema = z.object({
  title: z.string().min(2).max(20).trim(),

  description: z.string().max(150).optional().default(''),

  isEnabled: z.boolean().optional().default(true),

  propertyDefinitions: propertyDefinitionsZodSchema.optional().default([]),
});

// ============================================
// UPDATE PET TYPE SCHEMA (All fields optional)
// ============================================
export const updatePetTypeZodSchema = z.object({
  title: z.string().min(2).max(20).trim().optional(),

  description: z.string().max(150).optional(),

  isEnabled: z.boolean().optional(),

  propertyDefinitions: propertyDefinitionsZodSchema.optional(),
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
  search: z.string().max(50).optional(), // ✅ fixed: .max() before .optional()
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
