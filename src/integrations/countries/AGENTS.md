# Countries Integration

## Purpose

Provides `GET /api/countries` from the local `db.json` reference dataset.

## Important Files

- `db.json` — bundled country records containing English and Persian names plus ISO country codes.
- `countries.service.js` — maps the local dataset into the public response shape.
- `countries.helpers.js` — converts local records to the public country shape and builds flag-logo URLs from `COUNTRY_FLAGS`.
- `countries.controller.js` and `countries.route.js` — return the integration through Express.
- `countries.unit.test.js` and `countries.integration.test.js` — cover local-data mapping and the HTTP contract.

## Flow

`GET /api/countries -> controller -> service -> local data -> mapping helper`

## Modification Rules

- Keep local data shape out of controllers.
- Update mapped-response tests when the local dataset schema changes.

## Summary

- Public country data is normalized from the bundled reference dataset.
- Each country includes an SVG flag-logo URL derived from its ISO code.
