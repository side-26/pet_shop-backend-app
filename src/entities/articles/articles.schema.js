import { z } from 'zod';

import '#configs/zod.config.js';
import { parseRichTextFormValue } from '#utils/richText.helpers.js';

const { array, object, preprocess, string, unknown, url } = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);
const titleSchema = string().trim().min(2).max(180);
const imageSchema = url().max(2048);
const thumbnailSchema = string().trim().min(1).max(10240);
const tagSchema = object({ title: string().trim().min(1).max(60) });
const mainTextSchema = preprocess(
  parseRichTextFormValue,
  unknown().refine((value) => value !== undefined, {
    message: 'متن اصلی الزامی است',
  }),
);

const articleFields = {
  title: titleSchema,
  subtitle: string().trim().min(1).max(240),
  mainImage: imageSchema,
  mainThumbnailImage: thumbnailSchema,
  summary: string().trim().max(600).optional(),
  tags: array(tagSchema).max(20).optional(),
  petType: objectIdSchema.optional(),
};

export const createArticleZodSchema = object({
  ...articleFields,
  tags: articleFields.tags.default([]),
  mainText: mainTextSchema,
});

export const updateArticleZodSchema = object(articleFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'حداقل یک فیلد باید ارسال شود',
  });

export const updateArticleMainTextZodSchema = object({
  mainText: mainTextSchema,
});

export const articleIdZodSchema = object({ id: objectIdSchema });
export const articleSlugZodSchema = object({
  slug: string().trim().min(1).max(300),
});
