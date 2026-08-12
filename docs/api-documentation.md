# API Documentation Workflow

OpenAPI 3.0 is the repository's API contract. Scalar renders that same contract as the interactive reference; there is no Swagger UI.

## Runtime endpoints

- `/openapi.json` returns `src/configs/openapi.json` for tools and clients.
- `/docs` renders Scalar configured with `/openapi.json` as its only specification source.

Both routes are currently exposed in every environment, matching the repository's previous documentation exposure policy. Scalar receives a documentation-specific Content Security Policy while the application's global security middleware remains enabled.

## API collections

The server URL ends with `/api`, and every documented path begins with its collection segment. The resulting route format is `baseURL/api/collection/endpoint`.

The OpenAPI generator automatically assigns each operation to a Scalar collection named after that first segment, including its leading slash. For example, `/api/users/profile` belongs to `/users`, `/api/cart/add` belongs to `/cart`, and `/api/orders/:id` belongs to `/orders`. Do not manually assign a different tag to an operation; collection tags are normalized whenever `npm run openapi` runs.

## Updating the contract

Public HTTP changes include routes, path/query parameters, request bodies, authentication, authorization, responses, statuses, schemas, and pagination. For each such change:

1. update implementation and validation;
2. update the owning route's OpenAPI annotations and reusable components in `src/configs/openapi-schemas.js` when applicable;
3. run `npm run openapi`;
4. verify `/openapi.json` and Scalar `/docs`;
5. run relevant tests and check module documentation.

`swagger-autogen` is intentionally retained as the OpenAPI generator because existing route annotations use its directive syntax. Its name does not mean Swagger UI is present.
