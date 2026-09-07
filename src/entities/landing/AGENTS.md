# Landing Entity

## Purpose

Provides public, read-only homepage sections from the enabled pet-type and product catalogs. It owns no collection; `landing.model.js` composes bounded queries over those source collections.

## Endpoints

- `GET /landing/pet-types` — up to four enabled pet types, ordered by creation date.
- `GET /landing/products/discounted` — up to four enabled products, ordered by discount percentage.
- `GET /landing/pet-types/all` — every enabled pet type, ordered by creation date.
- `GET /landing/products/popular` — up to four enabled products, ordered by sales volume.

## Rules

- All endpoints are public and return only enabled catalog records.
- Featured section limits are centralized in `landing.constants.js`.
- Queries are ordinary bounded Mongoose queries and do not create cursors, caches, timers, or other long-lived resources.
