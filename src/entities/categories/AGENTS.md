# Categories Entity

## Purpose

Owns product categories associated with pet types, including status management, filtering, and retrieval.

## Important Files

- `categories.model.js` — category persistence, Zod-backed hooks, generated slugs, images, and relationship indexes.
- `categories.service.js` — CRUD, image lifecycle, status, pet-type validation, filtering, and formatting.
- `categories.schema.js` — create, update, model-update, id, and query validation.
- `categories.controller.js`, `categories.route.js`, and `categories.helpers.js` — protected HTTP operations and pure search helpers.
- Colocated tests cover service and routes.

## Dependencies

References `PetTypeModel`; subcategories and products reference categories.

## Modification Rules

- Validate pet-type relationships in the service.
- Create requires a `mainImage` multipart upload. Update accepts an optional replacement image and preserves the current image when it is omitted. Persist uploaded images as a public URL in `mainImage` and their generated data URL in `mainThumbnailImage`.
- Use `isEnable` for category status. Generate new category slugs from the title with a pet-type suffix so equal titles under different pet types remain unique.
- Treat public category contract changes as potential impacts on subcategories and products.

## Summary

- Categories connect product taxonomy to pet types.
- They are parent records for subcategories and product references.
