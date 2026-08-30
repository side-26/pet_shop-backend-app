import { z } from 'zod';

import { BREED_LEVELS, IMAGE_UPLOAD } from '#configs/constants.js';
import '#configs/zod.config.js';

const {
  array,
  boolean,
  coerce,
  enum: zodEnum,
  number,
  object,
  preprocess,
  string,
  unknown,
} = z;

const breedLevelSchema = coerce
  .number()
  .int()
  .refine((value) => BREED_LEVELS.includes(value));

const mongoObjectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);
const nullableText = (schema) =>
  preprocess((value) => (value === 'null' ? null : value), schema.nullable());
const nullableBreedLevelSchema = preprocess(
  (value) => (value === 'null' ? null : value),
  breedLevelSchema.nullable(),
);
const booleanSchema = preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  boolean(),
);

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

const propertyDefinitionValueZodSchema = object({
  label: string().trim().min(1).max(80),
  value: unknown().refine((value) => value !== undefined),
});

export const breedMainImageZodSchema = object({
  mimetype: zodEnum(IMAGE_UPLOAD.PET_TYPE_ALLOWED_MIME_TYPES),
  imageFileSize: number()
    .int()
    .positive()
    .max(IMAGE_UPLOAD.MAX_PET_TYPE_IMAGE_SIZE_BYTES),
});

export const createBreedZodSchema = object({
  title: string().trim().min(2).max(100),
  petType: mongoObjectIdSchema,
  country: nullableText(string().trim().min(2).max(100)),
  ageAverage: string().trim().min(1).max(50),
  size: breedLevelSchema,
  activityLevel: nullableBreedLevelSchema,
  enable: booleanSchema,
  propertyDefinitions: propertyDefinitionsZodSchema.optional().default([]),
});

export const updateBreedZodSchema = createBreedZodSchema;
export const breedModelUpdateZodSchema = createBreedZodSchema.partial();
export const breedIdSchema = object({ id: mongoObjectIdSchema });
export const breedSlugSchema = object({
  slug: string()
    .min(1)
    .max(50)
    .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u),
});

export const replaceBreedPropertyDefinitionsZodSchema = object({
  id: mongoObjectIdSchema,
  propertyDefinitions: array(propertyDefinitionValueZodSchema).max(50),
});

export const breedQuerySchema = object({
  petType: mongoObjectIdSchema.optional(),
  includeDisabled: string()
    .optional()
    .transform((value) => value === 'true'),
  search: string().trim().max(100).optional(),
  page: string()
    .optional()
    .transform((value) => Number.parseInt(value, 10) || 1),
  limit: string()
    .optional()
    .transform((value) => Number.parseInt(value, 10) || 10),
  sort: zodEnum(['title', 'createdAt', 'updatedAt'])
    .optional()
    .default('title'),
});
