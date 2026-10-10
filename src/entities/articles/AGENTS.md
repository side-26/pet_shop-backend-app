# Articles Entity

## Purpose

Owns management-authored pet-care articles and their public slug-based preview.

## Rules

- The author snapshot is derived only from the authenticated creator's User record; requests cannot supply it.
- `slug` is server-derived from the title and at most the first five tag titles. Tags are read and replaced only through their dedicated per-article endpoints; replacing tags recalculates the slug.
- `GET /articles/:slug`, `GET /articles/id/:id`, and `GET /articles/id/:id/main-text` are public. The ID detail route omits `mainText`; the dedicated main-text route returns only that field. Creation, detail updates, main-text updates, and deletion use the permission middleware.
- Admins may update or delete every article. Sellers may do so only when `createdBy` is their authenticated user ID.
- `mainText` is updated only through `/articles/:id/main-text`; the general update endpoint deliberately excludes it.
- `GET /articles/id/:id/tags-list` returns an article's tags; its author or an admin replaces them through `PUT /articles/id/:id/range-tags-list`.
- Article creation requires a multipart `mainImage`; detail updates may replace it. The backend stores the uploaded image URL and generates `mainThumbnailImage`, so clients must never send a thumbnail value.

## Files

- `articles.model.js` — article persistence, author/tag snapshots, indexes.
- `articles.schema.js` — request and route-param validation.
- `articles.service.js` — slug, creator snapshot, pet-type validation, author-scoped listing, persistence, and formatting.
- `articles.controller.js` and `articles.route.js` — HTTP orchestration and permission-resource loading.
- `articles.unit.test.js` and `articles.integration.test.js` — service and route coverage.

## Authenticated author list

- `GET /articles/all` returns only articles whose `createdBy` matches the authenticated user, newest first, with its `petType` reference populated.
- The existing permission policy lets an author edit or delete only their own article; admins retain access to every article.
