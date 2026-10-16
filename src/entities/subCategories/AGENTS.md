# Subcategories Entity

## Purpose

Owns product subcategories nested under categories.

## Important Files

- `subCategories.model.js` — persistence, Zod-backed hooks, and category-scoped indexes.
- `subCategories.service.js` — validates category relationships and owns CRUD, filtering, and formatting.
- `subCategories.schema.js` — create, update, model-update, id, and query validation.
- `subCategories.controller.js`, `subCategories.route.js`, and `subCategories.helpers.js` — protected HTTP operations and search helpers.
- Colocated tests cover service and route behavior.

## Dependencies

References `CategoryModel`; products reference subcategories.

## Modification Rules

- Preserve category/subcategory relationship integrity in the service.
- Evaluate product documentation and tests when the public relationship contract changes.

## Summary

- Subcategories are category-owned taxonomy records.
- Product validation depends on this relationship.
