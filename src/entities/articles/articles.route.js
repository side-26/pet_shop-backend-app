import express from 'express';

import { RateLimiter } from '#infrastructure/redis/rateLimit/rateLimit.core.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { permissionMiddleware } from '#middlewares/permission.middleware.js';

import {
  createArticleController,
  deleteArticleController,
  loadArticleForPermission,
  previewArticleController,
  updateArticleController,
  updateArticleMainTextController,
} from './articles.controller.js';
import { ARTICLE_ROUTES } from './route.path.js';

const router = express.Router();
new RateLimiter('articles').applyTo(router);

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
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ArticleCreateBody' } } } }
     #swagger.responses[201] = { description: 'Article created' } */
  authenticated,
  permissionMiddleware('articles', 'create'),
  createArticleController,
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

router.put(
  ARTICLE_ROUTES.articleById,
  /* #swagger.path = '/articles/id/{id}'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/ArticleUpdateBody' } } } }
     #swagger.responses[200] = { description: 'Article details updated' } */
  authenticated,
  loadArticleForPermission,
  permissionMiddleware('articles', 'update', (req) => req.article),
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
