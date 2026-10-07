import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  articleIdZodSchema,
  articleSlugZodSchema,
  createArticleZodSchema,
  updateArticleMainTextZodSchema,
  updateArticleZodSchema,
} from './articles.schema.js';
import { ArticleService } from './articles.service.js';

const getUserId = (user) => user?.userId || user?.id;

export const loadArticleForPermission = async (req, _res, next) => {
  try {
    const { id } = returnFormValidation(articleIdZodSchema, req.params);
    req.article = await ArticleService.findById(id);
    next();
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const createArticleController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createArticleZodSchema, req.body);
    const article = await ArticleService.create(body, getUserId(req.user));
    setSuccessResponse(res, STATUES.CREATED, {
      message: 'مقاله با موفقیت ایجاد شد',
      data: ArticleService.format(article),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getAuthorArticlesController = async (req, res, next) => {
  try {
    const articles = await ArticleService.findByAuthor(getUserId(req.user));
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ArticleService.formatMany(articles),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateArticleMainTextController = async (req, res, next) => {
  try {
    const body = returnFormValidation(updateArticleMainTextZodSchema, req.body);
    const article = await ArticleService.updateMainText(
      req.article,
      body,
      getUserId(req.user),
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'متن اصلی مقاله با موفقیت ویرایش شد',
      data: ArticleService.format(article),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateArticleController = async (req, res, next) => {
  try {
    const body = returnFormValidation(updateArticleZodSchema, req.body);
    const article = await ArticleService.updateDetails(
      req.article,
      body,
      getUserId(req.user),
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'اطلاعات مقاله با موفقیت ویرایش شد',
      data: ArticleService.format(article),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const deleteArticleController = async (req, res, next) => {
  try {
    await ArticleService.delete(req.article);
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'مقاله با موفقیت حذف شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const previewArticleController = async (req, res, next) => {
  try {
    const { slug } = returnFormValidation(articleSlugZodSchema, req.params);
    const article = await ArticleService.getPreviewBySlug(slug);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ArticleService.format(article),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
