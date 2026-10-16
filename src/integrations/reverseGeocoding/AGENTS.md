# Reverse Geocoding Integration

## Purpose

Converts latitude and longitude into address data through the Neshan API.

## Important Files

- `reverseGeocoding.client.js` — makes Neshan requests using the configured API key.
- `reverseGeocoding.service.js` — validates provider outcomes and maps failures to application errors.
- `reverseGeocoding.schema.js` — validates coordinate query parameters.
- `reverseGeocoding.controller.js` and `reverseGeocoding.route.js` — expose authenticated `GET /api/reverse-geocode`.
- Colocated unit and integration tests cover service and HTTP behavior.

## Flow

`authenticated route -> controller -> query validation -> service -> Neshan client`

## Modification Rules

- Access the API key through `src/configs/env.config.js`.
- Keep provider transport in the client and Persian error mapping in the service.
- Preserve authentication on the public route.

## Summary

- This is an authenticated external API adapter.
- Coordinates are validated before the Neshan request.
