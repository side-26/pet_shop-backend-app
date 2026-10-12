import express from 'express';

import { RateLimiter } from '#infrastructure/redis/rateLimit/rateLimit.core.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { permissionMiddleware } from '#middlewares/permission.middleware.js';
import { uploadMainImage } from '#middlewares/upload.middleware.js';

import {
  createArticleController,
  deleteArticleController,
  getArticleByIdController,
  getArticleMainTextByIdController,
  getArticleTagsAndMatchedArticlesBySlugController,
  getArticleTagsController,
  getAuthorArticlesController,
  getPaginatedArticlesController,
  loadArticleForPermission,
  previewArticleController,
  replaceArticleTagsController,
  updateArticleController,
  updateArticleMainTextController,
} from './articles.controller.js';
import { ARTICLE_ROUTES } from './route.path.js';

const router = express.Router();
new RateLimiter('articles').applyTo(router);

router.get(
  ARTICLE_ROUTES.articleAuthorAll,
  /* #swagger.path = '/articles/all'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.summary = 'List the authenticated author\'s articles'
     #swagger.responses[200] = { description: 'Authenticated author articles with populated pet types returned' } */
  authenticated,
  getAuthorArticlesController,
);

router.get(
  ARTICLE_ROUTES.articlesPaginate,
  /* #swagger.path = '/articles/paginate'
     #swagger.summary = 'List articles with pet types and tag metadata'
     #swagger.parameters['page'] = { in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }
     #swagger.parameters['limit'] = { in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
     #swagger.responses[200] = { description: 'Paginated articles with author snapshots, populated pet types, and distinct tag metadata' } */
  getPaginatedArticlesController,
);

router.get(
  ARTICLE_ROUTES.articlePreviewBySlug,
  /* #swagger.path = '/articles/{slug}'
     #swagger.summary = 'Preview an article by its slug'
     #swagger.parameters['slug'] = { in: 'path', required: true, schema: { type: 'string' } }
     #swagger.responses[200] = { description: 'Article preview returned' }
     #swagger.responses[404] = { description: 'Article not found' } */
  previewArticleController,
);

router.post(
  ARTICLE_ROUTES.articles,
  /* #swagger.path = '/articles'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/ArticleMultipartBody' } } } }
     #swagger.responses[201] = { description: 'Article created' } */
  authenticated,
  permissionMiddleware('articles', 'create'),
  uploadMainImage,
  createArticleController,
);

router.get(
  ARTICLE_ROUTES.articleTagsById,
  /* #swagger.path = '/articles/id/{id}/tags-list' */
  getArticleTagsController,
);

router.get(
  ARTICLE_ROUTES.articleTagsAndMatchedArticlesBySlug,
  /* #swagger.path = '/articles/{slug}/tags-list/matched-articles'
     #swagger.summary = 'Get an article tags and its five closest tag matches'
     #swagger.parameters['slug'] = { in: 'path', required: true, schema: { type: 'string' } }
     #swagger.responses[200] = { description: 'Article tags and up to five matched articles returned without rich text' }
     #swagger.responses[404] = { description: 'Article not found' } */
  getArticleTagsAndMatchedArticlesBySlugController,
);

router.put(
  ARTICLE_ROUTES.articleTagsRangeById,
  /* #swagger.path = '/articles/id/{id}/range-tags-list'
     #swagger.security = [{ "bearerAuth": [] }] */
  authenticated,
  loadArticleForPermission,
  permissionMiddleware('articles', 'update', (req) => req.article),
  replaceArticleTagsController,
);

router.get(
  ARTICLE_ROUTES.articleMainTextById,
  /* #swagger.path = '/articles/id/{id}/main-text'
     #swagger.summary = 'Get an article main text by ID'
     #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
     #swagger.responses[200] = { description: 'Article main text returned' }
     #swagger.responses[404] = { description: 'Article not found' } */
  getArticleMainTextByIdController,
);

router.put(
  ARTICLE_ROUTES.articleMainTextById,
  /* #swagger.path = '/articles/id/{id}/main-text'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ArticleMainTextUpdateBody' } } } }
     #swagger.responses[200] = { description: 'Article main text updated' } */
  authenticated,
  loadArticleForPermission,
  permissionMiddleware('articles', 'update', (req) => req.article),
  updateArticleMainTextController,
);

router.get(
  ARTICLE_ROUTES.articleById,
  /* #swagger.path = '/articles/id/{id}'
     #swagger.summary = 'Get an article by ID without its main text'
     #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
     #swagger.responses[200] = { description: 'Article returned without main text' }
     #swagger.responses[404] = { description: 'Article not found' } */
  getArticleByIdController,
);

router.put(
  ARTICLE_ROUTES.articleById,
  /* #swagger.path = '/articles/id/{id}'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { $ref: '#/components/schemas/ArticleUpdateMultipartBody' } } } }
     #swagger.responses[200] = { description: 'Article details updated' } */
  authenticated,
  loadArticleForPermission,
  permissionMiddleware('articles', 'update', (req) => req.article),
  uploadMainImage,
  updateArticleController,
);

router.delete(
  ARTICLE_ROUTES.articleById,
  /* #swagger.path = '/articles/id/{id}'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Article deleted' } */
  authenticated,
  loadArticleForPermission,
  permissionMiddleware('articles', 'delete', (req) => req.article),
  deleteArticleController,
);

export default router;
