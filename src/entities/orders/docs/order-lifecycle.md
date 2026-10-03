# Order Lifecycle

## Snapshot creation

At payment-request time, the backend validates and snapshots the authenticated user's Cart into the Payment record. After successful gateway verification, the backend creates the immutable Order only from that stored checkout snapshot. Later Cart changes, including changes from another browser session, cannot affect the paid Order.

Each item preserves its original reference plus quantity, price, discount percentage, title, main image, and thumbnail. Product snapshots additionally preserve the selected weight's metric and value. Within the transaction, checkout atomically decrements the selected product-weight quantity, the derived product quantity, and increments product sales volume; insufficient stock aborts the full checkout. The full selected address and Tehran delivery-window interval are copied. Order totals, shipping price, payment type, and checkout shipping information are copied. Later Cart, address, Product, Pet, or quote changes cannot change the Order.

Gateway completion creates the Order, decrements product inventory, and marks the Payment paid in one MongoDB transaction. A repeated callback cannot create another Order because it can only transition a pending Payment once. This requires a MongoDB deployment with transaction support (a replica set or sharded cluster).

## Identifiers

- `orderNumber` is the public/business Order number.
- `trackingCode` is the application's separate Order tracking identifier.
- `shippingInfo.trackingCode` comes from the shipping provider.
- `paymentTrackingId` comes from the verified payment flow; no gateway verification integration currently exists in this repository.

`orderNumber` and `trackingCode` are independently generated nine-digit numeric NanoIDs with unique database indexes and bounded collision retries.

## Current lifecycle and API

```text
Cart → Payment checkout snapshot → verified payment → Order (deliveryState 0)
     → Admin/Seller shipping updates
     → Admin/Seller deliveryState updates through values 0–3
```

No meanings beyond the numeric `0–3` contract or transition state machine are currently defined.

- Gateway verification creates an Order from the Payment checkout snapshot. The frontend must not create an Order from its current Cart after redirect.
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
