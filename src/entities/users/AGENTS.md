# Users Entity

## Purpose

Owns public customer registration, OTP requests for existing phone numbers, user accounts, login and token refresh, profile data, password changes, addresses, status administration, user listing, carts, and wishlists.

## Important Files

- `users.model.js` — user, embedded-address, structured cart, polymorphic cart-item, and polymorphic wishlist-item persistence with Zod-backed save/update validation.
- `users.service.js` — authentication, JWT creation, password hashing, profile images, addresses, carts, wishlists, authorization-aware targeting, filtering, and formatting.
- `users.schema.js` — request schemas for accounts, tokens, profiles, passwords, addresses, carts, and wishlists.
- `users.controller.js` and `users.route.js` — compose public, authenticated, and role-restricted endpoints.
- `users.helpers.js` — full-name formatting.
- Colocated unit and integration tests cover service behavior and HTTP contracts.

## Dependencies

Uses `ObjectStorageService` and image helpers for profile images, the Melipayamak OTP integration, the shared Redis OTP store, separate access-token and refresh-token secrets through shared JWT/environment helpers, roles/status constants, authentication/role/upload middleware, and the shared Redis rate limiter for login attempts.

## Modification Rules

- Public password reset requires `newPassword` and matching `confirmPassword` values of at least eight characters plus the exact temporary JWT in a Bearer authorization header. The service verifies the token with `TEMPORARY_TOKEN_SECRET_KEY`, matches it against the phone-scoped Redis value, hashes and updates the user's password, and conditionally deletes the matching Redis token after success to prevent replay. Invalid, expired, missing, or mismatched tokens return Persian 403 access denied.
- Keep passwords hashed and exclude sensitive fields from public formatting.
- Public registration accepts only phone number and password and always assigns the customer role server-side.
- Public OTP requests require an existing phone number, atomically reserve the phone-and-IP Redis key before contacting the provider, replace only the owned reservation with a bcrypt hash for 120 seconds, never return the provider code, and return the active key's remaining TTL without requesting another code until it expires.
- Public OTP verification requires a valid phone number and six-digit `otp-code`, accepts optional `reset-password` (default `false`), reads the phone-and-requester-IP Redis key, and compares the bcrypt hash. A normal success returns the login token data without a message. Password-reset success signs a Nano ID and phone number with `TEMPORARY_TOKEN_SECRET_KEY`, atomically stores the token under the phone number for five minutes, and returns it with its remaining `expiry` and a Persian success message. Repeated successful requests return the current Redis token. Only three reset-token requests are allowed per phone and requester IP in the five-minute window; later requests return Persian 403 access denied. Expired OTP keys require requesting a new code.
- The global API method middleware checks registration before overlapping dynamic user routes and returns 405 for methods other than POST.
- Sign and verify access tokens with `JWT_SECRET_KEY`; sign and verify refresh tokens with `JWT_REFRESH_SECRET_KEY`.
- Limit `/users/login` to three requests per requester IP in a fixed two-minute Redis window; both successful and failed attempts consume the same route bucket.
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
