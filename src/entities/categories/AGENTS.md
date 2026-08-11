# Categories Entity

## Purpose

Owns product categories associated with pet types, including status management, filtering, and retrieval.

## Important Files

- `categories.model.js` — category persistence, Zod-backed hooks, and relationship indexes.
- `categories.service.js` — CRUD, status, pet-type validation, filtering, and formatting.
- `categories.schema.js` — create, update, model-update, id, and query validation.
- `categories.controller.js`, `categories.route.js`, and `categories.helpers.js` — protected HTTP operations and pure search helpers.
- Colocated tests cover service and routes.

## Dependencies

References `PetTypeModel`; subcategories and products reference categories.

## Modification Rules

- Validate pet-type relationships in the service.
- Treat public category contract changes as potential impacts on subcategories and products.

## Summary

- Categories connect product taxonomy to pet types.
- They are parent records for subcategories and product references.
