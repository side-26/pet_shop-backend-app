# Pet Shop Backend

This repository is an Express 5 and Mongoose backend.

## API documentation

OpenAPI 3.0 is the machine-readable API contract. Scalar is the only interactive API reference UI.

- OpenAPI document: `GET /openapi.json`
- Scalar API reference: `GET /docs`
- Regenerate the contract after public API changes: `npm run openapi`

Swagger UI is not used. `swagger-autogen` remains only as the generator that converts colocated route annotations and shared schemas into `src/configs/openapi.json`.
