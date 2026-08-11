# Locations Integration

## Purpose

Exposes persisted Iranian province and city reference data.

## Important Files

- `locations.model.js` — Mongoose models for provinces and cities.
- `locations.service.js` — reads all provinces or cities for a province identifier.
- `locations.schema.js` — validates the province route parameter.
- `locations.controller.js` and `locations.route.js` — expose `/api/provinces` and `/api/cities/:provinceId`.
- Colocated unit and integration tests cover service and route behavior.

## Flow

`route -> controller -> service -> ProvinceModel/CityModel`

## Modification Rules

- Keep reference-data queries in the service.
- Update schema, Persian Zod mappings, and both test layers when route inputs change.

## Summary

- Location data is local MongoDB reference data, not a remote client integration.
- Province identifiers connect city lookups to province records.
