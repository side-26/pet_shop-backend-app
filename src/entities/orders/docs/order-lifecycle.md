# Order Lifecycle

## Snapshot creation

After successful payment verification, `POST /api/orders` receives the gateway's `paymentTrackingId`. The service loads and reprices the authenticated user's cart, verifies enabled Product/Pet references, quantities, the selected embedded address, delivery handover date, shipping price, and payment type, then creates an immutable Order snapshot.

Each item preserves its original reference plus quantity, price, discount percentage, title, main image, and thumbnail. The full selected address is copied with its source subdocument ID. Order totals, shipping price, delivery date, payment type, and checkout shipping information are copied. Later Cart, address, Product, or Pet changes cannot change the Order.

Cart contents and calculated prices are cleared only after Order persistence succeeds. If clearing fails, the newly created Order is removed as compensation and the Cart remains available.

## Identifiers

- `orderNumber` is the public/business Order number.
- `trackingCode` is the application's separate Order tracking identifier.
- `shippingInfo.trackingCode` comes from the shipping provider.
- `paymentTrackingId` comes from the verified payment flow; no gateway verification integration currently exists in this repository.

`orderNumber` and `trackingCode` are independently generated nine-digit numeric NanoIDs with unique database indexes and bounded collision retries.

## Current lifecycle and API

```text
Cart → verified payment → Order (deliveryState 0)
     → Admin/Seller shipping updates
     → Admin/Seller deliveryState updates through values 0–3
```

No meanings beyond the numeric `0–3` contract or transition state machine are currently defined.

- `POST /api/orders` creates an Order from the authenticated user's Cart.
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
