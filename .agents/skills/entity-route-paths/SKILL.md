---
name: entity-route-paths
description: Centralize every Express API path in its owning entity or integration route.path.js module. Use when adding, changing, or reviewing API routes, route registries, or OpenAPI path contracts.
---

# Entity Route Paths

Each entity or API integration that owns an Express router must own a sibling `route.path.js` module. Define each URL path exactly once there and export a clearly named route map, such as `PET_ROUTES` or `LOCATION_ROUTES`.

## Required usage

- Use the owning route map in `<entity>.route.js` for every `router.get`, `router.post`, `router.put`, `router.patch`, and `router.delete` declaration.
- Import the same route-map values into `src/configs/routeMethods.config.js`; never repeat the path string in that registry.
- Keep cart and wishlist paths in `users/route.path.js`, because the users entity owns those routers.
- Keep integration paths in their integration's `route.path.js` and include them in the central method registry.
- Remove superseded route constants and duplicated raw path strings from the affected scope in the same change.

## OpenAPI compatibility

The OpenAPI generator cannot infer a router path from a JavaScript constant. Keep the route's existing `#swagger.path` annotation when present, using the matching OpenAPI path (`:id` becomes `{id}`), and extend the generator before converting a route that has no such annotation. Run `npm run openapi` and verify `/openapi.json` and `/docs` after changing a route map or route declaration.

## Verification

Confirm every route-map entry is used by a router and every router path has a matching `API_ROUTE_METHODS` entry with its supported methods. Add or update route and method-middleware tests when the public contract changes.
