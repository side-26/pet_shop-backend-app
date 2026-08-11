# Countries Integration

## Purpose

Provides `GET /api/countries` using a remote countries provider with service-level mapping and caching.

## Important Files

- `countries.client.js` — performs the provider request using `COUNTRIES_API` settings.
- `countries.service.js` — caches responses, maps provider failures to application errors, and exposes cache clearing.
- `countries.helpers.js` — converts provider records to the public country shape.
- `countries.controller.js` and `countries.route.js` — return the integration through Express.
- `countries.unit.test.js` and `countries.integration.test.js` — cover service/client behavior and the HTTP contract.

## Flow

`GET /api/countries -> controller -> service -> cache or client -> mapping helper`

## Modification Rules

- Keep provider response shape out of controllers.
- Update caching and mapped response tests if provider behavior changes.

## Summary

- Public country data is normalized and cached by the service.
- Remote transport belongs only in the client.
