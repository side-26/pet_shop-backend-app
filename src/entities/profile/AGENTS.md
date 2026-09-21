# Profile Entity

## Purpose

Provides authenticated customer-facing account views. It owns no MongoDB collection; `profile.model.js` reads the existing Users collection, similarly to the landing entity’s read-model approach.

## Endpoints

- `GET /profile/account` — returns the authenticated enabled user’s personal information: ID, name, phone number, email, avatar, national code, and age.

## Rules

- Every endpoint requires a valid Redis-backed authenticated customer session.
- Profile responses never expose passwords, roles, account-status flags, carts, wishlists, addresses, or internal session data.
- Queries are bounded Mongoose queries and do not create cursors, caches, timers, or other long-lived resources.
