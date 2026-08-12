# Source Architecture

## Purpose

`src` contains the application bootstrap, business entities, integrations, and shared infrastructure.

## Important Files

### `app.js`

Builds the Express application, applies global security, header, logging, parsing, and rate-limit middleware, mounts all API routers, then installs error logging and handling.

### `server.js`

Connects MongoDB, starts the HTTP server, and handles shutdown signals and unhandled process errors.

### API documentation

`app.js` serves the generated OpenAPI contract at `/openapi.json` and Scalar at `/docs`. The generator and reusable components live under `configs`.

## Flow

`server.js -> database connection -> app.js -> middleware -> entity/integration route -> controller -> service -> model/client -> error middleware`

## Main Areas

- [`entities/AGENTS.md`](./entities/AGENTS.md) — business domains.
- [`integrations/AGENTS.md`](./integrations/AGENTS.md) — external APIs and location reference data.
- [`middlewares/AGENTS.md`](./middlewares/AGENTS.md) — request-wide HTTP concerns.
- [`configs/AGENTS.md`](./configs/AGENTS.md) — runtime and infrastructure configuration.
- [`services/AGENTS.md`](./services/AGENTS.md) — shared application services.
- [`utils/AGENTS.md`](./utils/AGENTS.md) — shared helpers.
- [`__tests__/AGENTS.md`](./__tests__/AGENTS.md) — integration-test environment setup.

## Modification Rules

- Mount new routers in `app.js` under `/api` and preserve error middleware ordering.
- Treat OpenAPI impact as part of every public HTTP contract change and verify Scalar rendering.
- Keep process startup and shutdown behavior in `server.js`, not in domain modules.
- Use the `#configs`, `#entities`, `#middlewares`, `#services`, and `#utils` import aliases configured in `package.json` and Jest mappings.

## Summary

- `app.js` owns the HTTP composition root.
- `server.js` owns database-backed process startup and shutdown.
- Domain behavior belongs below `entities`; external adapters belong below `integrations`.
