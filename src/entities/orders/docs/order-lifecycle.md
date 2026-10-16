# Order Lifecycle

## Snapshot creation

`POST /api/orders/prepare` validates the authenticated user's cart, saved address,
and enabled delivery-service window on the server, then creates the immutable
Order before gateway redirection. It reserves product inventory in the same
MongoDB transaction and leaves the active Cart unchanged. Later Cart changes,
including changes from another browser session, cannot affect the prepared
Order.

Each item preserves its original reference plus quantity, price, discount percentage, title, main image, and thumbnail. Product snapshots additionally preserve the selected weight's metric and value. Within the transaction, checkout atomically decrements the selected product-weight quantity, the derived product quantity, and increments product sales volume; insufficient stock aborts the full checkout. The full selected address and Tehran delivery-window interval are copied. Order totals, shipping price, payment type, and checkout shipping information are copied. Later Cart, address, Product, Pet, or quote changes cannot change the Order.

Prepared Orders remain `pending_payment` for fifteen minutes. Gateway completion
marks that exact Order paid in one MongoDB transaction; it does not create a
second Order or reserve stock again. Cancellation and expiry explicitly release
the reservation exactly once, tracked on the Order. This requires a MongoDB
deployment with transaction support (a replica set or sharded cluster).

For legacy failed, cancelled, or expired payments whose orders still show an
active reservation, run `npm run repair:failed-order-reservations -- --apply`.
The repair only restores product-weight inventory because pet inventory has
never been reserved by the order workflow. It skips paid and already-released
orders.

## Identifiers

- `orderNumber` is the public/business Order number.
- `trackingCode` is the application's separate Order tracking identifier.
- `shippingInfo.trackingCode` comes from the shipping provider.
- `paymentTrackingId` comes from the verified payment flow; no gateway verification integration currently exists in this repository.

`orderNumber` and `trackingCode` are independently generated nine-digit numeric NanoIDs with unique database indexes and bounded collision retries.

## Current lifecycle and API

```text
Cart → prepared Order + inventory reservation → Payment attempt → paid Order (deliveryState 0)
     → Admin/Seller shipping updates
     → Admin/Seller deliveryState updates through values 0–3
```

No meanings beyond the numeric `0–3` contract or transition state machine are currently defined.

- `POST /api/orders/prepare` accepts only address and delivery-selection IDs and returns the prepared Order ID, expiry, and server-calculated payable amount.
- `POST /api/orders` remains available for direct checkout. It accepts `{ paymentTrackingId }`, snapshots the finalized Cart, and clears the Cart within the same transaction.
- `POST /api/payments/request` accepts `{ orderId }` and creates one active payment attempt from that Order snapshot.
- Gateway verification updates the prepared Order only. The frontend must not create an Order from its current Cart after redirect.
- `GET /api/orders` returns the authenticated user's paginated Orders.
- `GET /api/orders/:id` returns one owned Order.
- `GET /api/orders/all` returns paginated Orders for Admin/Seller.
- `PATCH /api/orders/:id/delivery-state` updates a valid state for Admin/Seller.
- `PATCH /api/orders/:id/shipping-info` updates shipping fields for Admin/Seller.

Seller ownership scope is not defined in the repository, so Seller and Admin currently share management visibility, matching catalog management conventions.

## Pending dependencies and future phases

The InstalmentCompany entity does not exist. Orders safely preserve its nullable ObjectId without defining a broken model reference.

Payment factor PDF generation and `GET /orders/:id/factor` are future-phase work and are not implemented.

User Order rejection/return after `deliveryState === 3` is future-phase work and is not implemented. No rejection state, refund, controller, or route exists.
