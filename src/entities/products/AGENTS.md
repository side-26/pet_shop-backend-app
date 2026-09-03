# Products Entity

## Purpose

Owns the product catalog and separate customer-facing and management-facing operations.

## Important Files

- `products.model.js` — product persistence, configured limits, Zod-backed hooks, relationship filters, and text indexes.
- `products.service.js` — category/subcategory validation, CRUD, image and price section updates, status, search, pagination, and response formatting.
- `products.schema.js` — create, partial update, id, and query validation.
- `products.controller.js`, `products.route.js`, and `products.helpers.js` — HTTP orchestration and customer/management filters and projections.
- Colocated tests cover public and management behavior.

## Dependencies

References `CategoryModel` and `SubCategoryModel`; routes use authentication and role middleware.

## Modification Rules

- Keep customer responses restricted to customer-safe formatting and enabled records.
- Validate category/subcategory consistency in the service.
- Create and replace main/gallery images through the image section APIs; convert uploads to WebP and generate `mainImageThumbnail` server-side as a Base64 Data URL.
- Generate product slugs server-side from the title and product ID; create products enabled with zero price and discount, then manage status and pricing through their dedicated APIs.
- Reuse shared pagination, statuses, errors, and product limits.

## Summary

- Customer and management product contracts are intentionally distinct.
- Product taxonomy integrity depends on categories and subcategories.
