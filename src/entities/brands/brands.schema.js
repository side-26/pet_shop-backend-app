import { z } from 'zod';

import { IMAGE_UPLOAD } from '#configs/constants.js';
import '#configs/zod.config.js';
import { parseRichTextFormValue } from '#utils/richText.helpers.js';

const {
  boolean,
  enum: zodEnum,
  number,
  object,
  preprocess,
  string,
  unknown,
} = z;

const booleanSchema = preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  boolean(),
);
const richTextSchema = preprocess(parseRichTextFormValue, unknown());

const brandFields = {
  title: string().trim().min(2).max(100),
  title_fa: string().trim().min(2).max(100),
  description: richTextSchema.optional().default(''),
  isEnable: booleanSchema.optional().default(true),
};

export const createBrandZodSchema = object(brandFields);
export const brandIdZodSchema = object({
  id: string().regex(/^[0-9a-fA-F]{24}$/),
});
export const brandLogoZodSchema = object({
  mimetype: zodEnum(IMAGE_UPLOAD.ALLOWED_MIME_TYPES),
  imageFileSize: number()
    .int()
    .positive()
    .max(IMAGE_UPLOAD.MAX_BRAND_LOGO_SIZE_BYTES),
});
