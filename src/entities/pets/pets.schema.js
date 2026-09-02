import { z } from 'zod';

import { IMAGE_PROCESSING, PET_LIMITS } from '#configs/constants.js';
import '#configs/zod.config.js';

const {
  array,
  boolean,
  coerce,
  enum: enumValue,
  object,
  preprocess,
  string,
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
  array(imageSchema).max(PET_LIMITS.MAX_IMAGES),
);
const summarySchema = string().trim().max(500).optional();
const descriptionSchema = string().trim().min(1).max(5000);
const quantitySchema = coerce.number().int().min(0);
const priceSchema = coerce.number().min(0);
const discountPercentageSchema = coerce
  .number()
  .min(PET_LIMITS.MIN_DISCOUNT_PERCENTAGE)
  .max(PET_LIMITS.MAX_DISCOUNT_PERCENTAGE);
const slugSchema = string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const booleanSchema = preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  boolean(),
);
const priceRangeSchema = string()
  .trim()
  .regex(/^\d+(?:\.\d+)?-\d+(?:\.\d+)?$/)
  .transform((value) => {
    const [minimum, maximum] = value.split('-').map(Number);
    return { minimum, maximum };
  })
  .refine(({ minimum, maximum }) => minimum <= maximum, {
    message: 'حداقل قیمت نباید بیشتر از حداکثر قیمت باشد',
  });

const petFields = {
  title: titleSchema,
  mainImage: imageSchema,
  images: imageListSchema,
  mainImageThumbnail: thumbnailSchema,
  summary: summarySchema,
  description: descriptionSchema,
  petType: objectIdSchema,
  breed: objectIdSchema,
  quantity: quantitySchema,
  price: priceSchema,
  discountPercentage: discountPercentageSchema,
  inEnable: booleanSchema,
  slug: slugSchema,
};

export const petPersistedZodSchema = object({
  ...petFields,
  images: petFields.images.optional().default([]),
  quantity: quantitySchema.optional().default(0),
  price: priceSchema.optional().default(0),
  discountPercentage: discountPercentageSchema.optional().default(0),
});

const petRequestFields = { ...petFields };
delete petRequestFields.mainImage;
delete petRequestFields.mainImageThumbnail;

export const createPetZodSchema = object({
  ...petRequestFields,
  images: petRequestFields.images.optional().default([]),
  quantity: quantitySchema.optional().default(0),
  price: priceSchema.optional().default(0),
  discountPercentage: discountPercentageSchema.optional().default(0),
});
export const updatePetBaseInfoZodSchema = object({
  title: titleSchema,
  summary: summarySchema,
  description: descriptionSchema,
  petType: objectIdSchema,
  breed: objectIdSchema,
  quantity: quantitySchema,
})
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'حداقل یک فیلد باید ارسال شود',
  });
export const updatePetImagesZodSchema = object({}).strict();
export const updatePetPriceZodSchema = object({
  price: priceSchema,
  discountPercentage: discountPercentageSchema,
})
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'حداقل یک فیلد باید ارسال شود',
  });
export const petModelUpdateZodSchema = object(petFields).partial();
export const petIdSchema = object({ id: objectIdSchema });

export const petQuerySchema = object({
  title: string().trim().max(150).optional(),
  petType: objectIdSchema.optional(),
  breed: objectIdSchema.optional(),
  quantity: quantitySchema.optional(),
  isEnable: booleanSchema.optional(),
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce.number().int().min(1).max(100).optional().default(10),
  sort: enumValue(['title', 'createdAt', 'updatedAt', 'price', 'quantity'])
    .optional()
    .default('createdAt'),
});

export const customerPetQuerySchema = object({
  title: string().trim().max(150).optional(),
  petType: objectIdSchema.optional(),
  breed: objectIdSchema.optional(),
  priceRange: priceRangeSchema.optional(),
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce.number().int().min(1).max(100).optional().default(10),
  sort: enumValue(['title', 'createdAt', 'updatedAt', 'price', 'quantity'])
    .optional()
    .default('createdAt'),
});
