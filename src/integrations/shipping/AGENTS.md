# Shipping Integration

## Purpose

Provides provider-independent delivery-window quotes for orders delivered within Iran. The current adapter is a deterministic mock suitable for portfolio demonstrations and can be replaced by a real carrier client without changing cart or order orchestration.

## Rules

- All windows use `Asia/Tehran` metadata and are persisted as UTC instants.
- Mock availability varies deterministically by cart, address, and request date, skips Fridays, and expires after fifteen minutes.
- The client owns provider-specific generation. `ShippingService` is the application-facing integration boundary.
- No timers, background jobs, sockets, caches, or other long-lived resources are created.
