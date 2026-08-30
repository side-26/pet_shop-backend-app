import { z } from 'zod';

import { IMAGE_UPLOAD } from '#configs/constants.js';
import '#configs/zod.config.js';

const { array, boolean, enum: zodEnum, number, object, string, unknown } = z;

const propertyDefinitionZodSchema = object({
  key: string()
    .trim()
    .regex(/^[a-z][a-zA-Z0-9]*$/),
  label: string().trim().min(1).max(80),
  valueType: zodEnum(['string', 'number', 'boolean', 'date', 'enum']),
  required: boolean().optional().default(false),
  options: array(string().trim().min(1)).min(1).optional(),
  min: number().optional(),
  max: number().optional(),
  defaultValue: unknown().optional(),
}).superRefine((definition, context) => {
  if (definition.valueType === 'enum' && !definition.options?.length) {
    context.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'ویژگی‌های انتخابی باید حداقل یک گزینه داشته باشند',
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
      message: 'حداقل مقدار نمی‌تواند از حداکثر مقدار بیشتر باشد',
    });
  }
});

const propertyDefinitionsZodSchema = array(propertyDefinitionZodSchema)
  .max(50)
  .superRefine((definitions, context) => {
    const seenKeys = new Set();

    definitions.forEach((definition, index) => {
      if (seenKeys.has(definition.key)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: 'کلید ویژگی‌ها باید یکتا باشد',
        });
      }
      seenKeys.add(definition.key);
    });
  });

export const petTypeMainImageZodSchema = object({
  mimetype: zodEnum(IMAGE_UPLOAD.PET_TYPE_ALLOWED_MIME_TYPES),
  imageFileSize: number()
    .int()
    .positive()
    .max(IMAGE_UPLOAD.MAX_PET_TYPE_IMAGE_SIZE_BYTES),
});

export const createPetTypeZodSchema = object({
  title: string().min(2).max(20).trim(),
  description: string().max(150).optional().default(''),
  isEnabled: boolean().optional().default(true),
  propertyDefinitions: propertyDefinitionsZodSchema.optional().default([]),
});

export const updatePetTypeZodSchema = object({
  title: string().min(2).max(20).trim().optional(),
  description: string().max(150).optional(),
  isEnabled: boolean().optional(),
  propertyDefinitions: propertyDefinitionsZodSchema.optional(),
});

export const petTypeIdSchema = object({
  id: string()
    .min(1)
    .regex(/^[0-9a-fA-F]{24}$/),
});

export const petTypeSlugSchema = object({
  slug: string()
    .min(1)
    .max(50)
    .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u),
});

export const petTypeQuerySchema = object({
  includeDisabled: string()
    .optional()
    .transform((value) => value === 'true'),
  search: string().max(50).optional(),
  page: string()
    .optional()
    .transform((value) => parseInt(value) || 1),
  limit: string()
    .optional()
    .transform((value) => parseInt(value) || 10),
  sortBy: string().optional().default('createdAt'),
  sortOrder: zodEnum(['asc', 'desc']).optional().default('asc'),
});

export const bulkPetTypeSchema = object({
  types: array(
    object({
      title: string().min(2).max(20).trim(),
      description: string().max(150).optional().default(''),
      isEnabled: boolean().optional().default(true),
    }),
  ).min(1),
});

export const petTypeStatusSchema = object({
  isEnabled: boolean(),
});

export default {
  createPetTypeZodSchema,
  updatePetTypeZodSchema,
  petTypeMainImageZodSchema,
  petTypeIdSchema,
  petTypeSlugSchema,
  petTypeQuerySchema,
  bulkPetTypeSchema,
  petTypeStatusSchema,
};
