# Shared Services

## Purpose

This folder contains services used across entity boundaries.

## Important Files

### `objectStorage.service.js`

Uploads, replaces, and deletes images in Arvan's S3-compatible object storage. It uses image/object-storage constants and returns complete public bucket URLs for persisted image fields.

### `objectStorage.service.unit.test.js`

Mocks the S3 client and verifies storage success and failure behavior without network access.

### `mainImage.service.js`

Processes Product and Pet main-image buffers, uploads the full WebP image, returns a matching Base64 blur placeholder, and provides rollback/replacement cleanup helpers.

## Dependencies

The users, products, and pets services use object storage; image transformation is provided by `src/utils/image.helpers.js`.

## Modification Rules

- Keep provider operations and error translation inside the service.
- Persist complete public image URLs, never raw object keys or metadata objects.
- Mock external clients in unit tests.

## Summary

- Cross-domain service logic belongs here.
- Object storage is the shared external storage boundary.
