# Cart and Wishlist

The authenticated user owns both collections. Clients never provide a user ID for these operations.

## Storage

Cart entries embed an entry ID, a polymorphic `item` reference, an `itemType` of `product` or `pet`, and a positive integer `quantity`. Wishlist entries have the same reference and type fields but no quantity. Mongoose resolves the reference to the `Products` or `Pets` model from `itemType`.

The `(item, itemType)` pair is unique within each collection. Adding an existing cart item updates its quantity to the submitted value. Adding an existing wishlist item returns the standard duplicate-resource validation error. Delete endpoints address the embedded entry `_id`, not the referenced Product or Pet ID.

## Authenticated endpoints

- `POST /api/cart/add`
- `DELETE /api/cart/delete/:id`
- `GET /api/cart/all`
- `POST /api/wishlist/add`
- `DELETE /api/wishlist/delete/:id`
- `GET /api/wishlist/all`

Add requests validate the referenced ID and type and confirm the Product or Pet exists. List requests populate `item` and expose `itemType`; all reads and mutations are scoped to the authenticated user's ID.

The legacy `GET /api/users/cart/:id` route remains available for compatibility but new client workflows should use the authenticated `/api/cart/all` endpoint.
