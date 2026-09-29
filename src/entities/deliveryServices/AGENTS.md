# Delivery Services Entity

## Purpose

Owns the management-maintained delivery-provider directory and its pricing inputs.

## Contract

- Management endpoints require an authenticated management user (`admin` or `seller`). `GET /delivery-services/available?lat=…&lng=…` is public and returns only enabled providers.
- A provider has an English and Persian title, its origin as `[longitude, latitude]`, optional non-negative base and packing prices, positive in-city and out-of-city per-kilometre prices, and an enable state.
- `GET /delivery-services` returns enabled providers by default. Management users may pass `includeDisabled=true`.
- The public lookup returns each enabled provider's title, bucket-URL logo, exact seven-day `availability` slots as UTC ISO timestamps, distance, and `shippingPrice = (basePrice × distanceKm) + packingPrice`.
- `PATCH /delivery-services/:id/enable` and `/disable` preserve a provider's history while changing availability. `DELETE` permanently removes an unreferenced provider.
- `DeliveryServiceService.calculateQuote` uses the entity's origin and the shared Haversine helper. It currently applies the out-of-city `pricePerKilometer` rate after rounding distance up to the next kilometre, then adds the base and packing prices. A caller must explicitly select `pricePerKilometerInCity` for an in-city quote.

## Resource lifecycle

This entity creates no timers, listeners, streams, caches, or other long-lived resources. Database operations are request-scoped and owned by Mongoose.
