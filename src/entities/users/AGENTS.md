# Users Entity

## Purpose

Owns public customer registration, user accounts, login and token refresh, profile data, password changes, addresses, status administration, user listing, carts, and wishlists.

## Important Files

- `users.model.js` — user, embedded-address, structured cart, polymorphic cart-item, and polymorphic wishlist-item persistence with Zod-backed save/update validation.
- `users.service.js` — authentication, JWT creation, password hashing, profile images, addresses, carts, wishlists, authorization-aware targeting, filtering, and formatting.
- `users.schema.js` — request schemas for accounts, tokens, profiles, passwords, addresses, carts, and wishlists.
- `users.controller.js` and `users.route.js` — compose public, authenticated, and role-restricted endpoints.
- `users.helpers.js` — full-name formatting.
- Colocated unit and integration tests cover service behavior and HTTP contracts.

## Dependencies

Uses `ObjectStorageService` and image helpers for profile images, separate access-token and refresh-token secrets through shared JWT/environment helpers, roles/status constants, and authentication/role/upload middleware.

## Modification Rules

- Keep passwords hashed and exclude sensitive fields from public formatting.
- Public registration accepts only phone number and password and always assigns the customer role server-side.
- The global API method middleware checks registration before overlapping dynamic user routes and returns 405 for methods other than POST.
- Sign and verify access tokens with `JWT_SECRET_KEY`; sign and verify refresh tokens with `JWT_REFRESH_SECRET_KEY`.
- The successful login response returns both tokens, the string `userId`, the user's `role`, and the access/session expiration timestamps as Unix milliseconds derived from the JWT `exp` claims.
- Preserve actor-versus-target authorization rules for profile and address operations.
- Persist uploaded images as complete public URLs.
- Cart and wishlist operations always derive ownership from the authenticated actor. See [`docs/cart.md`](./docs/cart.md) and [`docs/cart-and-wishlist.md`](./docs/cart-and-wishlist.md).

## Summary

- The service owns security-sensitive account and token behavior.
- Addresses are embedded user data with configured limits.
- The structured cart stores checkout metadata and server-calculated pricing around Product/Pet items; wishlist entries reference the same entity types without quantity.
- A finalized Cart is transformed into an immutable Order snapshot before its contents and calculated prices are cleared.
- Routes mix public authentication endpoints and protected administration/profile endpoints.
