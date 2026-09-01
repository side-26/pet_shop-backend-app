# Breeds Entity

## Purpose

Owns breed records associated with pet types, including management lifecycle, filtering, search, and pagination.

## Important Files

- `breeds.model.js` — persistence, Zod-backed hooks, property definitions, slug generation, and indexes.
- `breeds.service.js` — validates pet-type relationships and owns CRUD, property-definition replacement/read formatting, slug lookup, main-image upload/replacement, thumbnail generation, status, filtering, pagination, and formatting.
- `breeds.schema.js` — body, identifier, model-update, and query validation.
- `breeds.controller.js`, `breeds.route.js`, and `breeds.helpers.js` — HTTP orchestration and pure filters/formatting.
- Colocated tests cover service and route behavior.

## Dependencies

References `PetTypeModel`; pets reference breeds.

## Modification Rules

- Preserve breed uniqueness within a pet type.
- Validate referenced pet types in the service and reuse shared pagination.
- `PUT /breeds/range` replaces a breed’s property values with `{ label, value }` entries; `GET /breeds/property-definitions/:id` returns them as `{ result }`.
- Breed slugs are generated from titles, preserve Unicode letters and numbers, and are available through `GET /breeds/slug/:slug`.
- Create requires a JPEG/JPG, PNG, or WebP `mainImage` multipart file smaller than 1 MB. Update accepts an optional replacement image and preserves the current image when omitted. Persist uploaded images as a public URL in `mainImage` and their generated sub-10 KB data URL in `thumbnailImage`.

## Summary

- Breeds are children of pet types.
- The service owns relationship integrity and management operations.
