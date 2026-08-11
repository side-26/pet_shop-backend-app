# Test Setup

## Purpose

This folder owns shared integration-test environment setup.

## Important Files

### `setup.js`

Loads test environment variables, starts MongoDB Memory Server, connects Mongoose before tests, clears collections between tests, and closes resources afterward.

## Dependencies

`jest.config.js` loads this file for the integration-oriented test suite. The unit-only Jest configuration intentionally does not load it.

## Modification Rules

- Keep setup deterministic and isolated from development or production databases.
- Do not add external network dependencies to test bootstrap.

## Summary

- Integration tests share an ephemeral MongoDB lifecycle.
- Unit tests remain independent of this setup.
