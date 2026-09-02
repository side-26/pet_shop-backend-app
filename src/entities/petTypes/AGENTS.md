# Pet Types Entity

## Purpose

Owns pet-type definitions, slugs, enablement state, and configurable property definitions used by pet-related domains.

## Important Files

- `petTypes.model.js` — persistence, virtual display name, hooks, indexes, and enabled/slug query statics.
- `petTypes.service.js` — CRUD, Arvan-backed main-image upload/replacement/deletion, automatic thumbnail generation, status transitions, filtering, Redis-backed public reads, cache invalidation, and public formatting.
- `petTypes.cache.store.js` — owns the bounded Redis cache namespace and safe cache-aside reads for pet-type detail and list responses.
- `petTypes.schema.js` — create, update, id, slug, query, bulk, and status validation.
- `petTypes.controller.js` and `petTypes.route.js` — public reads plus protected management operations.
- Colocated unit and integration tests cover both layers.

## Dependencies

Breeds, pets, and categories reference pet types.

## Modification Rules

- Treat schema/property changes as dependent contracts for breeds, pets, and categories.
- Preserve slug/index behavior and enabled-only public behavior.
- Auto-generated slugs preserve Unicode letters and numbers (including Persian titles) and use an ID-based non-empty fallback when a title contains only symbols.
- Create requires a JPEG/JPG, PNG, or WebP `mainImage` multipart file smaller than 1 MB. Update accepts an optional replacement image and preserves the current image when omitted. The service generates the required sub-10 KB `thumbnail` and persists the full public bucket URL for uploaded images.
- `PUT /pet-types/range` replaces a pet type’s property definitions with `{ label, value }` entries; `GET /pet-types/property-definitions/:id` returns them as `{ result }`.
- Cache only public read results. Mutations must load a Mongoose document from MongoDB, then invalidate enabled/all list keys and the affected ID and slug keys after persistence. Redis failures are logged and must not override MongoDB reads or writes; cache entries have a five-minute TTL.

## Summary

- Pet types are a shared taxonomy root.
- Changes can propagate to three dependent entity modules.
