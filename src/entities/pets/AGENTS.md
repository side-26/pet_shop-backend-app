# Pets Entity

## Purpose

Owns the pet catalog and its separate customer-facing and management-facing views.

## Important Files

- `pets.model.js` — pet persistence, limits, Zod-backed hooks, filters, and text indexes.
- `pets.service.js` — pet-type/breed validation, CRUD, main-image upload and replacement, enable/disable, filtered pagination, and view formatting.
- `pets.schema.js` — create, base-info, image, price, id, and management/customer query validation.
- `pets.controller.js`, `pets.route.js`, and `pets.helpers.js` — route orchestration and customer/management filters and projections.
- Colocated tests cover public and management behavior.

## Dependencies

References `PetTypeModel` and `BreedModel`; routes use authentication, role checks, and pet-image uploads.

## Modification Rules

- Keep customer responses restricted to customer-safe formatting and enabled records.
- Validate pet type and breed relationships in the service.
- Persist full uploaded images as complete public URLs.
- Accept the main image as a multipart upload and generate `mainImageThumbnail` server-side as a WebP Base64 Data URL.
- Management pagination is exposed at `GET /pets/paginate` and filters by `title`, `petType`, `breed`, `quantity`, and `isEnable`.
- Customer full-data pagination is exposed at `GET /pets/customer/paginate`, always restricts results to `inEnable: true`, and filters by `title`, `petType`, `breed`, and inclusive `priceRange=MIN-MAX`.
- Every paginated pet response uses `data: { result, pagination }`; never place `pagination` beside `data`.
- Management reads and updates base information, images, and prices through `/pets/:id/base-info`, `/pets/:id/images`, and `/pets/:id/price`; the generic `PUT /pets/:id` updates base information only.
- Persist and return the pet availability property as `inEnable`; map the pagination-only `isEnable` query parameter to it.

## Summary

- Customer and management contracts are intentionally distinct.
- Pet taxonomy integrity depends on pet types and breeds.
