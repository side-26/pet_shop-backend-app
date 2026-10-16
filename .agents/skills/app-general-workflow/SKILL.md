---
name: app-general-workflow
description: Enforce this application's production-quality change workflow, entity-layer architecture, test conventions, and shared-constant usage. Use for every coding task in this repository, especially when creating, changing, reviewing, fixing, or testing backend entities and their model, service, controller, route, or helper files.
---

# App General Workflow

Apply these requirements to every code change in this repository.

## Change workflow

1. Inspect the affected implementation, callers, routes, schemas, constants, and tests before editing.
2. Preserve unrelated user changes and follow existing project conventions unless this workflow explicitly replaces them.
3. Implement the smallest complete production-ready change. Check validation, error handling, authorization, data integrity, compatibility, maintainability, and relevant failure paths.
4. Identify tests related to every changed behavior. Add or update tests when behavior changes or coverage is missing.
5. Run focused linting and related tests first, then run the broadest practical relevant suite.
6. If a test fails or conflicts with the change, determine whether the implementation or expectation is wrong and fix the root cause. Do not weaken, delete, or skip a valid test merely to obtain a passing run.
7. Inspect the final diff and run formatting/lint checks. Report what was verified and disclose anything that could not be run.
8. When adding or changing a Zod schema, inspect `src/configs/zod.config.js`. Add Persian field labels and Persian mappings for every newly used Zod issue code when they are missing.
9. Group imports in new or modified files in this order: external packages, internal application imports, then relative imports. Separate each non-empty group with one blank line.
10. Never call Zod schema builders through `z.<functionName>`. Destructure every required builder from `z` first and use those destructured functions throughout the schema.

## Entity architecture

Every entity must contain these four layers:

- `<entityName>.model.js`: persistence schema, indexes, and database-level validation.
- `<entityName>.service.js`: business logic and database operations. Controllers must not contain business logic.
- `<entityName>.controller.js`: request validation, service orchestration, and HTTP responses.
- `<entityName>.route.js`: endpoint definitions and middleware composition.

Use `<entityName>.helpers.js` only for pure or entity-specific helpers used by that entity. Do not put service, controller, persistence, or routing logic in helpers.

When a helper is used by more than one entity, move it to `src/utils` in a focused shared helper module. Update every consumer and related test.

Follow the exact `<entityName>.<layer>.js` naming pattern and keep the entity name consistent across its files.

## Entity tests

Every entity must have both:

- `<entityName>.unit.test.js`: unit-test every public service function, including success and meaningful failure paths. Mock persistence and external dependencies so tests remain service-focused.
- `<entityName>.integration.test.js`: exercise routes and controllers together with middleware and persistence integration appropriate to the test environment. Cover validation, response status and shape, authorization where relevant, success, and important failures.

Place tests with the entity unless the repository establishes a stricter convention. When adding or changing a service function or endpoint, update both corresponding test layers in the same change.

## Constants

Reuse existing constants such as `STATUES`, `ROLES`, and domain constants in production code and tests instead of repeating their literal values.

Create a clearly named constant when a stable value represents shared domain vocabulary, protocol behavior, status, role, error code, property type, or another repeated concept. Keep entity-only constants with the entity and cross-entity constants in the shared constants module. Do not turn incidental one-use values into constants without a maintenance benefit.

When introducing a constant, replace applicable duplicated literals and test behavior through the constant-backed public interface.

## Storage and message rules

- Persist uploaded image fields as their complete public bucket URL string. Do not store an object key or an image metadata object in an entity document.
- Write every application success, validation, error, and informational message in Persian. This includes messages originating from middleware, services, controllers, storage integrations, and mapped third-party errors.
- For every new schema field, add or confirm its Persian label in `src/configs/zod.config.js`. For every newly used Zod validation issue code, add or confirm its Persian mapping there.
