# Test Setup

## Purpose

This folder owns shared integration-test environment setup.

## Important Files

### `setup.js`

Loads test environment variables, connects Mongoose to a process-isolated database derived from `MONGODB_TEST_URI` (or starts MongoDB Memory Server when it is absent), clears collections between tests, and drops/disconnects the isolated database afterward.

## Dependencies

`jest.config.js` loads this file for the integration-oriented test suite. The unit-only Jest configuration intentionally does not load it.

## Modification Rules

- Keep setup deterministic and isolated from development or production databases. Never connect integration tests directly to the configured base test-database name.
- Do not add external network dependencies to test bootstrap.

## Summary

- Each Jest process owns an isolated MongoDB lifecycle and deterministic database cleanup.
- Unit tests remain independent of this setup.
