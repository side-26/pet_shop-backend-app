# Middlewares

## Purpose

This folder owns cross-cutting Express request behavior: authentication, role checks, headers, security, logging, uploads, and final error responses.

## Important Files

- `auth.middleware.js` and `role.middleware.js` — verify JWT identity and allowed roles.
- `security.middleware.js` and `header.middleware.js` — configure Helmet, rate limiting, and CORS-related headers.
- `logger.middleware.js` — records request completion and errors through the shared logger.
- `upload.middleware.js` — applies configured Multer upload limits for avatars and Product/Pet main images.
- `error.middleware.js` — converts propagated errors to the final HTTP response.
- `permission.middleware.js` — current extension point for permission checks.

## Flow

Global middleware is ordered in `src/app.js`; route-specific authentication, roles, validation, and uploads are composed in entity routes.

## Modification Rules

- Preserve security/header placement before `/api` rate limiting and error middleware placement after routers.
- Return Persian error messages using shared status/constants and response helpers.
- Add focused middleware tests for request/response behavior and failure paths.

## Summary

- Global ordering is controlled by `src/app.js`.
- Authorization and upload middleware are composed at route level.
- Errors flow to `error.middleware.js` through `next`.
