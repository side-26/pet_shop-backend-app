# Breeds Entity

## Purpose

Owns breed records associated with pet types, including management lifecycle, filtering, search, and pagination.

## Important Files

- `breeds.model.js` — persistence, Zod-backed hooks, and unique title/pet-type index.
- `breeds.service.js` — validates pet-type relationships and owns CRUD, status, filtering, pagination, and formatting.
- `breeds.schema.js` — body, identifier, model-update, and query validation.
- `breeds.controller.js`, `breeds.route.js`, and `breeds.helpers.js` — HTTP orchestration and pure filters/formatting.
- Colocated tests cover service and route behavior.

## Dependencies

References `PetTypeModel`; pets reference breeds.

## Modification Rules

- Preserve breed uniqueness within a pet type.
- Validate referenced pet types in the service and reuse shared pagination.

## Summary

- Breeds are children of pet types.
- The service owns relationship integrity and management operations.
