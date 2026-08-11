# Users Entity

## Purpose

Owns user accounts, login and token refresh, profile data, password changes, addresses, status administration, user listing, and cart retrieval.

## Important Files

- `users.model.js` — user and embedded-address persistence with Zod-backed save/update validation.
- `users.service.js` — authentication, JWT creation, password hashing, profile images, addresses, authorization-aware targeting, filtering, and formatting.
- `users.schema.js` — request schemas for accounts, tokens, profiles, passwords, and addresses.
- `users.controller.js` and `users.route.js` — compose public, authenticated, and role-restricted endpoints.
- `users.helpers.js` — full-name formatting.
- Colocated unit and integration tests cover service behavior and HTTP contracts.

## Dependencies

Uses `ObjectStorageService` and image helpers for profile images, shared JWT/environment helpers, roles/status constants, and authentication/role/upload middleware.

## Modification Rules

- Keep passwords hashed and exclude sensitive fields from public formatting.
- Preserve actor-versus-target authorization rules for profile and address operations.
- Persist uploaded images as complete public URLs.

## Summary

- The service owns security-sensitive account and token behavior.
- Addresses are embedded user data with configured limits.
- Routes mix public authentication endpoints and protected administration/profile endpoints.
