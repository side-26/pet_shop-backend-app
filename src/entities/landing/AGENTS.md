# Landing Entity

## Purpose

Provides public, read-only homepage sections from the enabled pet-type and product catalogs. It owns no collection; `landing.model.js` composes bounded queries over those source collections.

## Endpoints

- `GET /landing/pet-types` — up to four enabled pet types, ordered by creation date, each with its main image, thumbnail, and summary.
- `GET /landing/products/discounted?limit=COUNT` — enabled products ordered by discount percentage, with the main image thumbnail, source price, discount percentage, and response-only calculated discount amount; `limit` defaults to four and is capped at 100.
- `GET /landing/pet-types/all` — every enabled pet type, ordered by creation date, each with its main image, thumbnail, and summary.
- `GET /landing/products/popular` — up to four enabled products, ordered by sales volume, with the main image thumbnail, source price, discount percentage, and response-only calculated discount amount.
- `GET /landing/pets/popular` — up to five enabled pets ranked by non-management wishlist frequency; it falls back to sales volume when no enabled pets are wishlisted and supplements sparse results with the highest-priced enabled pets.
- `GET /landing/pets/recent` — up to five enabled, in-stock pets that were updated or enabled by a user, ordered by their most recent update and supplemented with highest-priced available pets when needed.
- `GET /landing/pets/:slug` — full customer-safe detail for an enabled pet.
- `GET /landing/products/:slug` — full customer-safe detail for an enabled product.

## Rules

- All endpoints are public and return only enabled catalog records.
- Slug detail endpoints validate the path parameter and reuse the catalog entities' full customer-detail formatters, including populated taxonomy and brand relations.
- Featured section limits are centralized in `landing.constants.js`.
- Landing product summaries calculate `discountPrice` as `price * (discountPercentage / 100)` without persisting it to product documents.
- Landing product summaries return `mainImageThumbnail` whenever their source product has a main image thumbnail.
- Popular pets aggregate non-management user wishlists without persisting rankings. When no enabled wishlisted pets are available, they use sales volume; a result with fewer than four pets is supplemented by highest price, without duplicates.
- Recent pets require a non-null `updatedBy`, `inEnable: true`, and `quantity > 0`; they are ordered by `updatedAt` descending with `_id` as a deterministic tie-breaker. Fewer than five results are supplemented by distinct enabled, in-stock pets ordered by price descending.
- Queries are ordinary bounded Mongoose queries and do not create cursors, caches, timers, or other long-lived resources.
