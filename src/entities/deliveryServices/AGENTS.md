# Delivery Services Entity

## Purpose

Owns the management-maintained delivery-provider directory and its pricing inputs.

## Contract

- Every endpoint requires an authenticated management user (`admin` or `seller`).
- A provider has an English and Persian title, its origin as `[longitude, latitude]`, optional non-negative base and packing prices, a positive per-kilometre price, and an enable state.
- `GET /delivery-services` returns enabled providers by default. Management users may pass `includeDisabled=true`.
- `PATCH /delivery-services/:id/enable` and `/disable` preserve a provider's history while changing availability. `DELETE` permanently removes an unreferenced provider.
- `DeliveryServiceService.calculateQuote` uses the entity's origin and the shared Haversine helper. It rounds distance up to the next kilometre before applying the per-kilometre price, then adds the base and packing prices.

## Resource lifecycle

This entity creates no timers, listeners, streams, caches, or other long-lived resources. Database operations are request-scoped and owned by Mongoose.
