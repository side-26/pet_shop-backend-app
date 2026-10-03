# Orders Entity

## Purpose

Owns immutable purchase snapshots created from authenticated users' finalized carts.

## Important Files

- `orders.model.js` — Order persistence, snapshot subdocuments, unique identifiers, delivery state, and indexes.
- `orders.service.js` — Cart transformation, ownership-aware reads, pagination, and management updates.
- `orders.schema.js` — creation, ID, query, delivery-state, and shipping validation.
- `orders.controller.js` and `orders.route.js` — authenticated user and Admin/Seller HTTP composition.
- `orders.helpers.js` — numeric NanoID generation and pure item/address snapshot mapping.
- Unit and integration tests cover service behavior and HTTP contracts.

## Rules

- Orders are historical snapshots, never live Cart or catalog pricing views.
- Prepared checkout recalculates the cart, snapshots the selected owned address and enabled delivery window, creates the Order, and reserves stock in one MongoDB transaction; it does not clear the active cart. Deployments must use a replica set or sharded cluster.
- The backwards-compatible direct checkout endpoint creates an immutable Order from a finalized Cart and clears that Cart in the same transaction; it requires a payment tracking ID.
- Prepared Orders expire after fifteen minutes. Payment cancellation or expiry releases their inventory reservation exactly once before marking payment failed.
- Only `deliveryState` and `shippingInfo` are mutable, and only through Admin/Seller routes.
- Checkout requires an unexpired quoted delivery window and snapshots that complete interval into the Order.
- User reads are always scoped to the authenticated user.
- Both user and management lists reuse shared pagination.
- See [`docs/order-lifecycle.md`](./docs/order-lifecycle.md) for lifecycle and future work.
