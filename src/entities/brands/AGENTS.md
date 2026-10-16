# Brands Entity

## Purpose

Owns the administration-managed product-brand directory.

## Contract

- `POST /brands` creates a brand. `logo` is an optional multipart image, limited to 1 MB, and is persisted as a public URL with its generated `thumbnailLogo`.
- `PUT /brands/:id` updates the same fields as creation. An optional replacement `logo` regenerates `thumbnailLogo` and removes the old stored logo after persistence succeeds.
- Every brand route requires authentication and a management role (`admin` or `seller`). `GET /brands` returns enabled brands by default; management consumers may pass `includeDisabled=true`.
- `GET /brands/enabled` is the explicit enabled-brand list and always filters `isEnable: true`.
- `GET /brands/:id` returns one brand. Management users can create, enable, disable, and delete brands.
- `slug` is generated on first persistence from `title`; it is not client-controlled.

## Resource lifecycle

The service owns each logo upload until persistence succeeds. If creation fails, it removes the newly uploaded object. Deletion removes the persisted logo object after the database record is deleted.
