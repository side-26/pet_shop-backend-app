# Entities

## Purpose

This folder contains the application's business-domain HTTP modules.

## Responsibilities

Each entity owns persistence, business logic, request orchestration, routes, validation schemas, optional pure helpers, and colocated unit/integration tests.

## Entity Map

- [`users/AGENTS.md`](./users/AGENTS.md) — accounts, authentication, profiles, addresses, roles, and carts.
- [`petTypes/AGENTS.md`](./petTypes/AGENTS.md) — pet-type definitions and configurable properties.
- [`breeds/AGENTS.md`](./breeds/AGENTS.md) — breeds associated with pet types.
- [`pets/AGENTS.md`](./pets/AGENTS.md) — customer and management pet catalog operations.
- [`categories/AGENTS.md`](./categories/AGENTS.md) — product categories associated with pet types.
- [`subCategories/AGENTS.md`](./subCategories/AGENTS.md) — category-owned product subdivisions.
- [`products/AGENTS.md`](./products/AGENTS.md) — customer and management product catalog operations.
- [`orders/AGENTS.md`](./orders/AGENTS.md) — immutable Cart snapshots, user Order history, and management delivery workflows.

## Flow

`<entity>.route.js -> middleware -> <entity>.controller.js -> <entity>.service.js -> <entity>.model.js`

Zod schemas validate request and model-update data. Public service functions are covered by `*.unit.test.js`; routes, controllers, middleware, and persistence are covered by `*.integration.test.js`.

## Modification Rules

- Preserve the mandatory model/service/controller/route split and exact `<entity>.<layer>.js` naming.
- Keep database queries and business rules in services, not controllers.
- Keep entity-specific pure formatting/filter helpers in `<entity>.helpers.js`; promote cross-entity helpers to `src/utils`.
- Update both unit and integration tests when a service function or endpoint changes.
- Reuse domain constants and keep application messages in Persian.
- Follow the root Zod, import grouping, and documentation synchronization rules.

## When Adding a Feature

Inspect the entity route, schema, controller, service, model, helpers, and both test layers; then check any entities whose public contract is affected.

## Summary

- Every active entity follows a layered HTTP-to-persistence structure.
- Tests and schemas are colocated with their entity.
- Cross-entity dependencies must remain explicit through models or shared utilities.
