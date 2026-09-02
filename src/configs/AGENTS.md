# Configs

## Purpose

This folder centralizes runtime environment access, MongoDB and object-storage clients, logging, upload limits, shared domain constants, Persian Zod errors, and OpenAPI generation/loading.

## Important Files

- `constants.js` — shared routes, statuses, roles and role groups, limits, error codes, integration settings, image settings, and rate-limit values.
- `routeMethods.config.js` — centralized API path and allowed-method registry consumed before routers.
- `env.config.js` — loads environment variables and exposes validated secret/API-key accessors.
- `db.config.js` — opens and closes the Mongoose connection used by `src/server.js`.
- `zod.config.js` — maps Zod issues and schema field names to Persian messages.
- `arvanCloud.config.js` and `upload.config.js` — configure S3-compatible storage and in-memory image uploads.
- `logger.js` — shared structured logger used by startup, middleware, and services.
- `openapi.generate.js` and `openapi-schemas.js` — generate the OpenAPI 3.0 contract from colocated route annotations and Zod-backed schemas, then add collection tags, method-not-allowed responses, and users-router rate-limit responses.
- `openapi.config.js` and `openapi.json` — load and store the single contract served to machines and Scalar.
- `openapi.unit.test.js` — verifies generated users-router rate-limit coverage, including static, paginated, login, and dynamic paths.

## Dependencies

All source layers depend on values from this folder; configuration files should not depend on entity controllers or routes.

## Modification Rules

- Sign password-reset temporary tokens only with the validated `TEMPORARY_TOKEN_SECRET_KEY` accessor.

- Add stable shared vocabulary to `constants.js` instead of duplicating literals.
- Access required secrets through `env.config.js` helpers.
- For every added or changed Zod field or issue code, update `zod.config.js` and its unit tests when coverage changes.
- Run `npm run openapi` whenever a route, validation schema, authentication/authorization rule, response, pagination contract, or HTTP status changes.
- OpenAPI is the contract and Scalar is the UI; never add Swagger UI middleware or dependencies.

## Summary

- Shared configuration and domain constants live here.
- Zod errors and field labels are Persian and centrally mapped.
- Infrastructure clients are configured once and consumed by services.
