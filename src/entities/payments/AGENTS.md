# Payments Entity

## Purpose

Owns gateway payment attempts for user-owned orders, including authority, expiry, gateway reference, and lifecycle status.

## Rules

- Customer payment requests create an immutable checkout snapshot from the authenticated user's current Cart; authority, amount, expiry, and gateway URL are generated from trusted server-side values.
- A checkout snapshot remains independent from later Cart changes in another browser and is used to create the final Order after verified payment completion.
- Gateway payment lookup is public but authority-scoped and returns only status, final price, company name, and frontend app URL.
- Only Admin and Seller roles can update a payment status.
- Gateway completion rejects expired or already processed payment attempts, atomically creates the final Order from the checkout snapshot, marks a pending payment as `paid`, and assigns its gateway reference ID.
- Payment statuses are `pending`, `paid`, and `failed`; they are separate from order-delivery status.

## Files

- `payments.model.js` — Mongoose schema, references, unique authority, and query indexes.
- `payments.service.js` — authorization-aware persistence operations.
- `payments.schema.js` — request, query, and status validation.
- `payments.controller.js` and `payments.route.js` — HTTP composition.
- Unit and integration tests cover service behavior and API contracts.
