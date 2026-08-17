# Repository agent instructions

## Architecture overview

This is an ES-module Express 5 and Mongoose backend. The normal HTTP flow is:

`src/app.js -> global middleware -> route -> controller -> service -> model or integration client`

## Repository map

- [`src/AGENTS.md`](./src/AGENTS.md) — application bootstrap and source architecture.
- [`src/entities/AGENTS.md`](./src/entities/AGENTS.md) — business-domain modules and their required layers.
- [`src/integrations/AGENTS.md`](./src/integrations/AGENTS.md) — external and reference-data adapters.
- [`src/middlewares/AGENTS.md`](./src/middlewares/AGENTS.md) — cross-cutting HTTP middleware.
- [`src/configs/AGENTS.md`](./src/configs/AGENTS.md) — environment, infrastructure, constants, validation messages, and OpenAPI configuration.
- [`src/services/AGENTS.md`](./src/services/AGENTS.md) — cross-domain application services.
- [`src/utils/AGENTS.md`](./src/utils/AGENTS.md) — shared response, pagination, token, path, and image helpers.

## Agent navigation

1. Locate the owning entity, integration, or shared subsystem.
2. Read the nearest `AGENTS.md` and any parent context it references.
3. Inspect the named implementation files and colocated tests.
4. Reuse shared constants, middleware, services, and utilities before adding new abstractions.
5. When code changes, apply the documentation synchronization rules below and update affected local or parent context in the same task.

## Documentation locality and synchronization

- Keep module-specific architecture, API, workflow, and business-rule documentation in the owning folder. Use a local `docs/` folder only when several supporting documents are needed; keep root documentation for genuinely cross-project topics.
- For every changed file, inspect the nearest `AGENTS.md`, local documentation, relevant parent context, directly referenced documents, and documentation for dependents whose public contract changed.
- Update documentation only when structure, responsibility, flow, contract, business rules, dependencies, or extension patterns became inaccurate. Propagate changes upward only when a higher-level architectural fact changed.
- When files are added, removed, renamed, or moved, update useful navigation entries and remove every stale path reference.
- Verify relative links and paths. Documentation synchronization is part of the same task and its status must be included in the final report.

For every coding task or code change in this repository, read and apply the complete workflow in `.agents/skills/app-general-workflow/SKILL.md`.

Treat `app-general-workflow` as mandatory repository policy even when the user does not explicitly name it. Apply its production-quality checks, entity architecture, test coverage, naming, and constant-usage rules before considering work complete.

For every coding task or code review in this repository, also read and apply `.agents/skills/prevent-memory-leaks/SKILL.md`. Treat it as mandatory repository policy. Audit every changed or affected timer, listener, stream, socket, database resource, watcher, subscription, cache, and background task for explicit ownership and deterministic cleanup. Store and clear timer handles on every applicable completion, cancellation, error, and shutdown path; refactor lifecycle leaks in the affected scope before considering work complete.

When adding or changing a Zod schema, inspect `src/configs/zod.config.js`. Add any missing Zod issue-code mapping and Persian field label in the same change.

In every new or modified source file, group imports in this order: external packages, internal application imports, then relative imports. Separate each non-empty group with one blank line.

Never call Zod schema builders through `z.<functionName>`. Destructure the required builders from `z` first, then use the destructured functions in schemas.

## API documentation

OpenAPI is the API contract and Scalar at `/docs` is the interactive reference. When routes, authentication, authorization, validation, schemas, pagination, responses, or HTTP statuses change, update the colocated OpenAPI annotations/components, run `npm run openapi`, and verify both `/openapi.json` and `/docs`. Do not add Swagger UI.
