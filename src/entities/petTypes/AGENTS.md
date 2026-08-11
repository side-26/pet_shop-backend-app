# Pet Types Entity

## Purpose

Owns pet-type definitions, slugs, enablement state, and configurable property definitions used by pet-related domains.

## Important Files

- `petTypes.model.js` — persistence, virtual display name, hooks, indexes, and enabled/slug query statics.
- `petTypes.service.js` — CRUD, status transitions, filtering, and public formatting.
- `petTypes.schema.js` — create, update, id, slug, query, bulk, and status validation.
- `petTypes.controller.js` and `petTypes.route.js` — public reads plus protected management operations.
- Colocated unit and integration tests cover both layers.

## Dependencies

Breeds, pets, and categories reference pet types.

## Modification Rules

- Treat schema/property changes as dependent contracts for breeds, pets, and categories.
- Preserve slug/index behavior and enabled-only public behavior.

## Summary

- Pet types are a shared taxonomy root.
- Changes can propagate to three dependent entity modules.
