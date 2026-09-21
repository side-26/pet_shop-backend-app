# Profile Entity

## Purpose

Provides authenticated customer-facing account views. It owns no MongoDB collection; `profile.model.js` reads the existing Users collection, similarly to the landing entity’s read-model approach.

## Endpoints

- `GET /profile/account` — returns the authenticated enabled user’s personal information: ID, name, phone number, email, avatar, national code, and age.
- `GET /profile/addresses` — returns the authenticated customer’s embedded address list.
- `GET /profile/addresses/:addressId` — returns one address owned by the authenticated customer.
- `PATCH /profile/addresses/:addressId` — updates one owned address with the Users entity’s established validation and delivery-quote reset rules.
- `POST /profile/addresses` — creates a new address owned by the authenticated customer.
- `DELETE /profile/addresses/:addressId` — removes one owned address and invalidates selected delivery data.
- `GET /profile/orders` — returns the authenticated customer’s paginated order snapshots.
- `GET /profile/orders/:id` — returns one order snapshot owned by the authenticated customer.

## Rules

- Every endpoint requires a valid Redis-backed authenticated customer session.
- Every operation also verifies that the customer account remains enabled before reading or changing profile data.
- Account responses never expose passwords, roles, account-status flags, carts, wishlists, addresses, or internal session data.
- Address lookups and updates are always scoped to the authenticated customer; another customer’s address is indistinguishable from a missing address.
- Order lists and details are always scoped to the authenticated customer and preserve immutable checkout snapshots.
- Queries are bounded Mongoose queries and do not create cursors, caches, timers, or other long-lived resources.
