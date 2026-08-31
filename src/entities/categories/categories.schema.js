import { z } from 'zod';

import { IMAGE_UPLOAD } from '#configs/constants.js';
import '#configs/zod.config.js';

const { boolean, enum: zodEnum, number, object, string } = z;

const mongoObjectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);

const categoryFields = {
  title: string().trim().min(2).max(50),
  petType: mongoObjectIdSchema,
  isEnable: boolean().optional().default(true),
};

export const categoryMainImageZodSchema = object({
  mimetype: zodEnum(IMAGE_UPLOAD.PET_TYPE_ALLOWED_MIME_TYPES),
  imageFileSize: number()
    .int()
    .positive()
    .max(IMAGE_UPLOAD.MAX_FILE_SIZE_BYTES),
});

export const createCategoryZodSchema = object(categoryFields);
export const updateCategoryZodSchema = object(categoryFields);
export const categoryModelUpdateZodSchema = object(categoryFields).partial();
export const categoryIdSchema = object({ id: mongoObjectIdSchema });

export const categoryQuerySchema = object({
  includeDisabled: string()
    .optional()
    .transform((value) => value === 'true'),
  petType: mongoObjectIdSchema.optional(),
});
