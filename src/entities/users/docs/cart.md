# User Cart

## Purpose and ownership

The Users module owns each authenticated user's cart. Cart endpoints derive the user ID from authentication and never accept a client-provided user ID. Product and Pet prices stored in their catalog documents are the pricing source of truth.

## Structure

`cart` is an embedded object with:

- `totalPrice`: server-calculated item price before discounts; default `0`.
- `items`: embedded polymorphic Product/Pet entries.
- `discountPrice`: server-calculated monetary discount; default `0`.
- `userAddress`: nullable ObjectId of a selected embedded user address.
- `deliveringDateToShipping`: nullable handover date.
- `shippingPrice`: shipping cost, separate from item pricing; default `0`.
- `shippingInfo`: provider `name`, `trackingCode`, and nullable `estimateDeliveryDate`.
- `paymentType`: `1` for direct payment or `2` for installments; default `1`.
- `instalmentCompany`: nullable ObjectId reserved for future integration.

User addresses are embedded subdocuments rather than a separate model. No cart-metadata update endpoint is part of the current workflow, so clients cannot currently assign `userAddress`, shipping fields, payment metadata, or calculated prices. A future metadata operation must verify that `userAddress` belongs to the authenticated user's `addresses` collection.

The `InstalmentCompany` entity does not exist. The nullable ObjectId intentionally has no Mongoose `ref`; direct payment always clears it to `null`. No incomplete company lookup or relationship behavior is implemented.

## Items and quantity

Each item has its own embedded `_id`, an `item` reference, `itemType` (`product` or `pet`), and positive integer `quantity`. The model dynamically resolves the reference to `Products` or `Pets`. A cart contains at most one `(item, itemType)` pair. Re-adding that pair atomically increases the existing quantity by the requested quantity.

Only enabled customer-visible Products and Pets can be added. Missing references already present in a cart are tolerated during recalculation and contribute nothing, preventing deleted catalog data from crashing cart reads.

## Pricing

Pricing is recalculated after every item add or delete and whenever the cart is read, so current catalog prices and discounts are used:

```text
totalPrice = Σ(item.price × quantity)

discountPrice = Σ(item.price × quantity × item.discountPercentage / 100)
```

`discountPrice` is the amount discounted, not the post-discount price. Shipping is excluded from both values. A future payable value can be calculated as `totalPrice - discountPrice + shippingPrice`; it is not persisted.

The add schema accepts only `itemId`, `itemType`, and `quantity`. Client-provided totals or checkout metadata are stripped by validation, so server-calculated values always win.

## API

- `POST /api/cart/add` adds a new item or increases an existing quantity.
- `DELETE /api/cart/delete/:id` deletes by embedded cart-item `_id` and recalculates pricing.
- `GET /api/cart/all` populates useful Product/Pet fields and refreshes pricing.
- `DELETE /api/cart/empty` clears `items`, `totalPrice`, and `discountPrice`.

Emptying is idempotent and deliberately preserves address, shipping, and payment selections because no existing business rule requires erasing checkout metadata.
