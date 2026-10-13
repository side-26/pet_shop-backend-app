import { z } from 'zod';

import '#configs/zod.config.js';
import { parseRichTextFormValue } from '#utils/richText.helpers.js';

import { ARTICLE_LIST_SORTS } from './articles.constants.js';

const {
  array,
  coerce,
  enum: enumValue,
  object,
  preprocess,
  string,
  unknown,
} = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);
const titleSchema = string().trim().min(2).max(180);
const tagTitleSchema = string().trim().min(1).max(60);
const tagSchema = object({ title: tagTitleSchema });
const tagFilterSchema = preprocess(
  (value) =>
    Array.isArray(value) ? value : value === undefined ? value : [value],
  array(tagTitleSchema).min(1).max(20).optional(),
);
const mainTextSchema = preprocess(
  parseRichTextFormValue,
  unknown().refine((value) => value !== undefined, {
    message: 'متن اصلی الزامی است',
  }),
);

const articleFields = {
  title: titleSchema,
  subtitle: string().trim().min(1).max(240),
  summary: string().trim().max(600).optional(),
  petType: objectIdSchema.optional(),
};

export const createArticleZodSchema = object({
  ...articleFields,
  mainText: mainTextSchema,
});

export const updateArticleZodSchema = object(articleFields).partial();

export const updateArticleMainTextZodSchema = object({
  mainText: mainTextSchema,
});

export const replaceArticleTagsZodSchema = object({
  tags: array(tagSchema).max(20),
});

export const articleIdZodSchema = object({ id: objectIdSchema });
export const articleSlugZodSchema = object({
  slug: string().trim().min(1).max(300),
});

export const articlePaginationZodSchema = object({
  tags: tagFilterSchema,
  petType: objectIdSchema.optional(),
  sort: enumValue(Object.values(ARTICLE_LIST_SORTS))
    .optional()
    .default(ARTICLE_LIST_SORTS.NEWEST),
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce.number().int().min(1).max(100).optional().default(10),
});
