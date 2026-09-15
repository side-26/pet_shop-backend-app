# Products Entity

## Purpose

Owns the product catalog and separate customer-facing and management-facing operations.

## Important Files

- `products.model.js` — product persistence, configured limits, Zod-backed hooks, relationship filters, and text indexes.
- `products.service.js` — category/brand/subcategory validation, CRUD, image/property-definition updates, weight-stock and variant-pricing management, status, search, pagination, and response formatting.
- `products.schema.js` — create, partial update, id, and query validation.
- `products.controller.js`, `products.route.js`, and `products.helpers.js` — HTTP orchestration and customer/management filters and projections.
- Colocated tests cover public and management behavior.

## Dependencies

References `CategoryModel`, `BrandModel`, and `SubCategoryModel`; routes use authentication and role middleware.

## Modification Rules

- Keep customer responses restricted to customer-safe formatting and enabled records.
- Validate brand existence and category/subcategory consistency in the service. A brand is required on product creation and main-information updates.
- Create and replace main/gallery images through the image section APIs; convert uploads to WebP and generate `mainImageThumbnail` server-side as a Base64 Data URL.
- Generate product slugs server-side from the title and product ID. Products are created enabled with no sellable weights; pricing becomes available only after a weight range is configured.
- Product price and discount are stored only on each weight. `minimumPayablePrice` and `maximumDiscountPercentage` are derived internal fields for catalog filtering and landing sorting; public product cards show the cheapest payable weight.
- Management reads and updates main information and images through `/products/:id/main-info` and `/products/:id/images`. Variant inventory and pricing are read through `GET /products/weights/:id` and replaced through management-only `PUT /products/range`, never catalog create/update APIs. Cart product entries select a weight, and order snapshots preserve that weight's metric, value, price, and discount.
- Product property definitions are read/replaced through dedicated endpoints, never ordinary create/update. Customer-only product-rating updates accept a value from 0 to 5 in 0.1 increments; a unique per-customer rating record maintains the cached product average and count transactionally.
- The internal `salesVolume` counter defaults to zero and is returned only for entries in the management paginated list; it is not accepted by catalog create/update APIs or returned by detail and section routes.
- Reuse shared pagination, statuses, errors, and product limits.

## Summary

- Customer and management product contracts are intentionally distinct.
- Product taxonomy integrity depends on categories and subcategories.
