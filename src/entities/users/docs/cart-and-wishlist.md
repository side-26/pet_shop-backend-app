# Cart and Wishlist

The authenticated user owns both collections. Clients never provide a user ID for these operations.

## Storage

Cart architecture and pricing are documented in [`cart.md`](./cart.md). Wishlist entries embed an entry ID, a polymorphic `item` reference, and an `itemType` of `product` or `pet`, without quantity. Mongoose resolves the reference to the `Products` or `Pets` model from `itemType`.

The `(item, itemType)` pair is unique within each collection. Adding an existing cart item increases its quantity; adding an existing wishlist item returns the standard duplicate-resource validation error. Delete endpoints address the embedded entry `_id`, not the referenced Product or Pet ID.

## Authenticated endpoints

- `POST /api/cart/add`
- `DELETE /api/cart/delete/:id`
- `GET /api/cart/all`
- `DELETE /api/cart/empty`
- `POST /api/wishlist/add`
- `DELETE /api/wishlist/delete/:id`
- `GET /api/wishlist/all`

Add requests validate the referenced ID and type and confirm the Product or Pet exists. List requests populate `item` and expose `itemType`; all reads and mutations are scoped to the authenticated user's ID.

Cart endpoints expose only the authenticated user's cart; the legacy user-ID-based cart route was removed because it did not enforce self-ownership.
