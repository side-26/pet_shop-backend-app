import { z } from 'zod';

import { IMAGE_PROCESSING, PRODUCT_LIMITS } from '#configs/constants.js';
import '#configs/zod.config.js';
import { parseRichTextFormValue } from '#utils/richText.helpers.js';

const {
  array,
  boolean,
  coerce,
  enum: enumValue,
  object,
  number,
  preprocess,
  string,
  unknown,
  url,
} = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);
const titleSchema = string().trim().min(2).max(150);
const imageSchema = url().max(2048);
const thumbnailSchema = string()
  .max(IMAGE_PROCESSING.MAX_THUMBNAIL_SIZE_BYTES - 1)
  .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/);
const imageListSchema = preprocess(
  (value) => (typeof value === 'string' ? [value] : value),
  array(imageSchema).max(PRODUCT_LIMITS.MAX_IMAGES),
);
const summarySchema = string().trim().max(500).optional();
const descriptionSchema = preprocess(
  parseRichTextFormValue,
  unknown().refine((value) => value !== undefined),
);
const quantitySchema = coerce.number().int().min(0);
const weightSchema = object({
  metric: string().trim().min(1).max(20).optional().default('KG'),
  quantity: quantitySchema,
  value: number().positive(),
});
const weightsSchema = array(weightSchema).max(PRODUCT_LIMITS.MAX_WEIGHTS);
const propertyDefinitionSchema = object({
  key: string()
    .trim()
    .regex(/^[a-z][a-zA-Z0-9]*$/),
  label: string().trim().min(1).max(80),
  valueType: enumValue(['string', 'number', 'boolean', 'date', 'enum']),
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
const propertyDefinitionsSchema = array(propertyDefinitionSchema)
  .max(50)
  .superRefine((definitions, context) => {
    const keys = new Set();
    definitions.forEach((definition, index) => {
      if (keys.has(definition.key))
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: 'کلید ویژگی‌ها باید یکتا باشد',
        });
      keys.add(definition.key);
    });
  });
const salesVolumeSchema = coerce.number().int().min(0);
const priceSchema = coerce.number().min(0);
const discountPercentageSchema = coerce
  .number()
  .min(PRODUCT_LIMITS.MIN_DISCOUNT_PERCENTAGE)
  .max(PRODUCT_LIMITS.MAX_DISCOUNT_PERCENTAGE);
const slugSchema = string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const booleanSchema = preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  boolean(),
);

const productFields = {
  title: titleSchema,
  mainImage: imageSchema,
  images: imageListSchema,
  mainImageThumbnail: thumbnailSchema,
  summary: summarySchema,
  description: descriptionSchema,
  category: objectIdSchema,
  brand: objectIdSchema,
  subCategory: objectIdSchema.nullable(),
  quantity: quantitySchema,
  weights: weightsSchema,
  userRate: number().min(0).max(5).multipleOf(0.1),
  propertyDefinitions: propertyDefinitionsSchema,
  salesVolume: salesVolumeSchema,
  price: priceSchema,
  discountPercentage: discountPercentageSchema,
  isEnable: booleanSchema,
  slug: slugSchema,
};

export const productPersistedZodSchema = object({
  ...productFields,
  images: productFields.images.optional().default([]),
  subCategory: productFields.subCategory.optional(),
  quantity: quantitySchema.optional().default(0),
  weights: weightsSchema.optional().default([]),
  userRate: number().min(0).max(5).multipleOf(0.1).optional().default(0),
  propertyDefinitions: propertyDefinitionsSchema.optional().default([]),
  salesVolume: salesVolumeSchema.optional().default(0),
  price: priceSchema.optional().default(0),
  discountPercentage: discountPercentageSchema.optional().default(0),
});

export const createProductZodSchema = object({
  title: titleSchema,
  summary: summarySchema,
  description: descriptionSchema,
  category: objectIdSchema,
  brand: objectIdSchema,
  subCategory: objectIdSchema.nullable().optional(),
  weights: weightsSchema.optional().default([]),
});
const productMainInfoFields = {
  title: titleSchema,
  summary: summarySchema,
  description: descriptionSchema,
  category: objectIdSchema,
  subCategory: objectIdSchema.nullable(),
  weights: weightsSchema,
};

export const updateProductMainInfoZodSchema = object({
  ...productMainInfoFields,
  brand: objectIdSchema,
})
  .partial({
    title: true,
    summary: true,
    description: true,
    category: true,
    subCategory: true,
    weights: true,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'حداقل یک فیلد باید ارسال شود',
  });
export const updateProductZodSchema = updateProductMainInfoZodSchema;
export const replaceProductPropertyDefinitionsZodSchema = object({
  id: objectIdSchema,
  propertyDefinitions: propertyDefinitionsSchema,
});
export const updateProductUserRateZodSchema = object({
  userRate: number().min(0).max(5).multipleOf(0.1),
});
export const updateProductImagesZodSchema = object({}).strict();
export const updateProductPriceZodSchema = object({
  price: priceSchema,
  discountPercentage: discountPercentageSchema,
})
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'حداقل یک فیلد باید ارسال شود',
  });
export const productModelUpdateZodSchema = object(productFields).partial();
export const productIdSchema = object({ id: objectIdSchema });

export const productQuerySchema = object({
  title: string().trim().max(150).optional(),
  search: string().trim().max(150).optional(),
  category: objectIdSchema.optional(),
  subCategory: objectIdSchema.optional(),
  quantity: quantitySchema.optional(),
  price: priceSchema.optional(),
  isEnable: booleanSchema.optional(),
  includeDisabled: string()
    .optional()
    .transform((value) => value === 'true'),
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce.number().int().min(1).max(100).optional().default(10),
  sort: enumValue(['title', 'createdAt', 'updatedAt', 'price', 'quantity'])
    .optional()
    .default('createdAt'),
});
