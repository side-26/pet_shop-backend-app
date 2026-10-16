# Locations Integration

## Purpose

Exposes persisted Iranian province and city reference data.

## Important Files

- `locations.model.js` — Mongoose models for provinces and cities, including province center coordinates.
- `locations.service.js` — reads all provinces or cities for a province identifier; supplies center-city coordinates from the built-in 31-province reference list when the MongoDB province collection is empty or an existing record lacks `latLng`.
- `locations.schema.js` — validates the province route parameter.
- `locations.controller.js` and `locations.route.js` — expose `/api/provinces` and `/api/cities/:provinceId`.
- `scripts/migrate-province-coordinates.js` — idempotently upserts province names and center-city `latLng` values into MongoDB; run with `npm run migrate:province-coordinates`.
- Colocated unit and integration tests cover service and route behavior.

## Flow

`route -> controller -> service -> ProvinceModel/CityModel`

## Modification Rules

- Keep reference-data queries in the service.
- Update schema, Persian Zod mappings, and both test layers when route inputs change.

## Summary

- Location data is local MongoDB reference data, not a remote client integration. Province reads fall back to the built-in reference list when no database seed has been loaded.
- Province identifiers connect city lookups to province records.
