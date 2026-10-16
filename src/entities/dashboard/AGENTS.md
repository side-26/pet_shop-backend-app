# Dashboard Entity

## Purpose

Provides admin-only, read-only metrics derived from orders, users, products, and pets.

## Important Files

- `dashboard.model.js` — MongoDB aggregation pipelines over the owning domain collections; it does not own a separate collection.
- `dashboard.service.js` — period resolution, concurrent metric orchestration, normalization, and error handling.
- `dashboard.schema.js` — date range, grouping, stock threshold, and independent result-limit validation.
- `dashboard.controller.js` and `dashboard.route.js` — HTTP response orchestration and admin authorization.
- Colocated unit and integration tests cover metric composition and the HTTP contract.

## Rules

- Only orders with `paymentStatus: paid` are recognized as sales; pending and failed orders are excluded from order-derived metrics.
- Revenue and top-selling data come from immutable order snapshots rather than catalog counters.
- `netRevenue` equals `totalPrice - discountPrice + shippingPrice`.
- Date grouping uses the `Asia/Tehran` timezone.
- Customer totals count customer-role accounts only, and the delivery-state breakdown always contains every configured state.
- The endpoint is read-only and available only to the Admin role.

## Summary

- `GET /dashboard/metrics` returns summary cards, delivery-state counts, a sales trend, top-selling items, low-stock items, and recent orders.
- Dashboard aggregation does not create timers, cursors, caches, or other long-lived resources.
