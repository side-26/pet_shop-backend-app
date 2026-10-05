# Payments Entity

## Purpose

Owns gateway payment attempts for user-owned orders, including authority, expiry, gateway reference, and lifecycle status.

## Rules

- Customer payment requests accept an owned, unexpired prepared Order; authority, amount, expiry, and gateway URL are generated from that trusted Order snapshot.
- Gateway completion updates the prepared Order after verification; it never creates a second Order or reserves stock.
- Gateway payment lookup is public but authority-scoped and returns only status, final price, expiry time, company name, and frontend app URL. A pending authority returns `410 Gone` after expiry.
- Only Admin and Seller roles can update a payment status.
- Gateway completion rejects expired payment attempts, atomically marks the existing prepared Order and its pending payment as `paid`, and assigns its gateway reference ID. Repeated completion callbacks are idempotent.
- Payment statuses are `pending`, `paid`, and `failed`; they are separate from order-delivery status.
- Terminal payment failures (`failed` and `cancelled`) release a pending prepared order’s inventory reservation and mark its payment status as failed exactly once.

## Files

- `payments.model.js` — Mongoose schema, references, unique authority, and query indexes.
- `payments.service.js` — authorization-aware persistence operations.
- `payments.schema.js` — request, query, and status validation.
- `payments.controller.js` and `payments.route.js` — HTTP composition.
- Unit and integration tests cover service behavior and API contracts.
