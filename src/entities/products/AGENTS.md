# Products Entity

## Purpose

Owns the product catalog and separate customer-facing and management-facing operations.

## Important Files

- `products.model.js` — product persistence, configured limits, Zod-backed hooks, relationship filters, and text indexes.
- `products.service.js` — category/subcategory validation, CRUD, main-image upload and replacement, status, search, pagination, and response formatting.
- `products.schema.js` — create, partial update, id, and query validation.
- `products.controller.js`, `products.route.js`, and `products.helpers.js` — HTTP orchestration and customer/management filters and projections.
- Colocated tests cover public and management behavior.

## Dependencies

References `CategoryModel` and `SubCategoryModel`; routes use authentication and role middleware.

## Modification Rules

- Keep customer responses restricted to customer-safe formatting and enabled records.
- Validate category/subcategory consistency in the service.
- Accept the main image as a multipart upload and generate `mainImageThumbnail` server-side as a WebP Base64 Data URL.
- Reuse shared pagination, statuses, errors, and product limits.

## Summary

- Customer and management product contracts are intentionally distinct.
- Product taxonomy integrity depends on categories and subcategories.
