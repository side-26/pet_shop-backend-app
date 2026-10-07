import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setErrorResponse,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  articleIdZodSchema,
  articleSlugZodSchema,
  createArticleZodSchema,
  replaceArticleTagsZodSchema,
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
    const article = await ArticleService.create(
      body,
      getUserId(req.user),
      req.file,
    );
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

export const getArticleByIdController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(articleIdZodSchema, req.params);
    const article = await ArticleService.getByIdWithoutMainText(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ArticleService.formatWithoutMainText(article),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getArticleMainTextByIdController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(articleIdZodSchema, req.params);
    const mainText = await ArticleService.getMainTextById(id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: { mainText } });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getArticleTagsController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(articleIdZodSchema, req.params);
    const article = await ArticleService.findById(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ArticleService.formatTags(article),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const replaceArticleTagsController = async (req, res, next) => {
  try {
    const { tags } = returnFormValidation(
      replaceArticleTagsZodSchema,
      req.body,
    );
    const article = await ArticleService.replaceTags(
      req.article,
      tags,
      getUserId(req.user),
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'برچسب‌های مقاله با موفقیت به‌روزرسانی شد',
      data: ArticleService.formatTags(article),
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
    if (Object.keys(body).length === 0 && !req.file) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'حداقل یک فیلد یا تصویر اصلی باید ارسال شود',
        code: 'ARTICLE_UPDATE_REQUIRED',
      });
    }
    const article = await ArticleService.updateDetails(
      req.article,
      body,
      getUserId(req.user),
      req.file,
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
    await ArticleService.delete(req.article, getUserId(req.user));
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
