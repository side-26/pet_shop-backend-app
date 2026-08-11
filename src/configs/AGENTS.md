# Configs

## Purpose

This folder centralizes runtime environment access, MongoDB and object-storage clients, logging, upload limits, shared domain constants, Persian Zod errors, and Swagger generation.

## Important Files

- `constants.js` — shared routes, statuses, roles, limits, error codes, integration settings, image settings, and rate-limit values.
- `env.config.js` — loads environment variables and exposes validated secret/API-key accessors.
- `db.config.js` — opens the Mongoose connection used by `src/server.js`.
- `zod.config.js` — maps Zod issues and schema field names to Persian messages.
- `arvanCloud.config.js` and `upload.config.js` — configure S3-compatible storage and in-memory image uploads.
- `logger.js` — shared structured logger used by startup, middleware, and services.
- `swagger.config.js` and `swagger-schemas.js` — generate OpenAPI output from routes and Zod-backed schemas.

## Dependencies

All source layers depend on values from this folder; configuration files should not depend on entity controllers or routes.

## Modification Rules

- Add stable shared vocabulary to `constants.js` instead of duplicating literals.
- Access required secrets through `env.config.js` helpers.
- For every added or changed Zod field or issue code, update `zod.config.js` and its unit tests when coverage changes.
- Regenerate Swagger output when public API documentation changes.

## Summary

- Shared configuration and domain constants live here.
- Zod errors and field labels are Persian and centrally mapped.
- Infrastructure clients are configured once and consumed by services.
