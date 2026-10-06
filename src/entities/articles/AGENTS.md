# Articles Entity

## Purpose

Owns management-authored pet-care articles and their public slug-based preview.

## Rules

- The author snapshot is derived only from the authenticated creator's User record; requests cannot supply it.
- `slug` is server-derived from the title and at most the first five tag titles. It is recalculated only when the title or tags change.
- `GET /articles/:slug` is public. Creation, detail updates, main-text updates, and deletion use the permission middleware.
- Admins may update or delete every article. Sellers may do so only when `createdBy` is their authenticated user ID.
- `mainText` is updated only through `/articles/:id/main-text`; the general update endpoint deliberately excludes it.

## Files

- `articles.model.js` — article persistence, author/tag snapshots, indexes.
- `articles.schema.js` — request and route-param validation.
- `articles.service.js` — slug, creator snapshot, pet-type validation, persistence, and formatting.
- `articles.controller.js` and `articles.route.js` — HTTP orchestration and permission-resource loading.
- `articles.unit.test.js` and `articles.integration.test.js` — service and route coverage.
