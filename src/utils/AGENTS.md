# Utilities

## Purpose

This folder contains shared helpers that are not owned by one entity.

## Important Files

- `helpers.js` — response builders, body checks, pagination, Zod validation, static serving, controller error forwarding, and separate access/refresh JWT verification.
- `image.helpers.js` — image format normalization, compression quality selection, conversion, and sub-10 KB WebP Data URL blur-placeholder creation.
- `fullPath.js` — resolves project-relative filesystem paths.
- `globalErrors.js` — legacy/global error definitions.
- `router.js` — shared Express router instance; active entity routes currently create their own routers.

## Dependencies

Entities and middleware consume response, pagination, token, and image helpers. Utilities consume shared constants and environment accessors but should not own entity persistence.

## Modification Rules

- Keep helpers pure where practical and avoid entity-specific business rules.
- Move a helper here only when multiple entities use it.
- Update focused unit tests for shared behavior, especially image processing and validation/response contracts.

## Summary

- Shared mechanics live here; domain rules do not.
- `helpers.js` is a high-impact dependency across controllers, services, and middleware.
