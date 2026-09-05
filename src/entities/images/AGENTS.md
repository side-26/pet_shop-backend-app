# Images Entity

## Purpose

Owns management-only upload and deletion of unassigned images in object storage.

## Important Files

- `images.service.js` — optimizes one uploaded image through Sharp, persists it below `management/images`, and validates bucket ownership before deletion.
- `images.schema.js`, `images.controller.js`, and `images.route.js` — validate deletion requests and expose the protected HTTP contract.

## Modification Rules

- This entity intentionally has no Mongoose model because it does not persist image records; the object-storage service is its persistence boundary.
- Only management roles can use `POST /images` and `DELETE /images`.
- Upload accepts multipart field `mainImage`, converts it to WebP, and returns its public URL. Delete accepts only a public URL owned by the configured bucket.
