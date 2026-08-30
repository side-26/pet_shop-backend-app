# Pet Types Entity

## Purpose

Owns pet-type definitions, slugs, enablement state, and configurable property definitions used by pet-related domains.

## Important Files

- `petTypes.model.js` — persistence, virtual display name, hooks, indexes, and enabled/slug query statics.
- `petTypes.service.js` — CRUD, required Arvan-backed main-image upload/replacement, automatic thumbnail generation, status transitions, filtering, Redis-backed public reads, cache invalidation, and public formatting.
- `petTypes.cache.store.js` — owns the bounded Redis cache namespace and safe cache-aside reads for pet-type detail and list responses.
- `petTypes.schema.js` — create, update, id, slug, query, bulk, and status validation.
- `petTypes.controller.js` and `petTypes.route.js` — public reads plus protected management operations.
- Colocated unit and integration tests cover both layers.

## Dependencies

Breeds, pets, and categories reference pet types.

## Modification Rules

- Treat schema/property changes as dependent contracts for breeds, pets, and categories.
- Preserve slug/index behavior and enabled-only public behavior.
- Create and update accept a required `mainImage` multipart file smaller than 1 MB; the service generates the required sub-10 KB `thumbnail` in parallel and persists the full public bucket URL.
- Cache only public read results. Mutations must load a Mongoose document from MongoDB, then invalidate enabled/all list keys and the affected ID and slug keys after persistence. Redis failures are logged and must not override MongoDB reads or writes; cache entries have a five-minute TTL.

## Summary

- Pet types are a shared taxonomy root.
- Changes can propagate to three dependent entity modules.
