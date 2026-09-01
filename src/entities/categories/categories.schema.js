import { z } from 'zod';

import { IMAGE_UPLOAD } from '#configs/constants.js';
import '#configs/zod.config.js';

const { boolean, enum: zodEnum, number, object, preprocess, string } = z;

const mongoObjectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);
const booleanSchema = preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  boolean(),
);

const categoryFields = {
  title: string().trim().min(2).max(50),
  petType: mongoObjectIdSchema,
  isEnable: booleanSchema.optional(),
};

export const categoryMainImageZodSchema = object({
  mimetype: zodEnum(IMAGE_UPLOAD.PET_TYPE_ALLOWED_MIME_TYPES),
  imageFileSize: number()
    .int()
    .positive()
    .max(IMAGE_UPLOAD.MAX_FILE_SIZE_BYTES),
});

export const createCategoryZodSchema = object({
  ...categoryFields,
  isEnable: booleanSchema.optional().default(true),
});
export const updateCategoryZodSchema = object(categoryFields);
export const categoryModelUpdateZodSchema = object(categoryFields).partial();
export const categoryIdSchema = object({ id: mongoObjectIdSchema });

export const categoryQuerySchema = object({
  includeDisabled: string()
    .optional()
    .transform((value) => value === 'true'),
  petType: mongoObjectIdSchema.optional(),
});
