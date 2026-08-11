# Integrations

## Purpose

This folder isolates external API adapters and location reference-data endpoints from business entities.

## Integration Map

- [`countries/AGENTS.md`](./countries/AGENTS.md) — cached country data from a remote countries API.
- [`locations/AGENTS.md`](./locations/AGENTS.md) — MongoDB-backed province and city lookup data.
- [`reverseGeocoding/AGENTS.md`](./reverseGeocoding/AGENTS.md) — authenticated coordinate lookup through Neshan.

## Flow

External adapters use `route -> controller -> service -> client`; locally persisted reference data uses `route -> controller -> service -> model`.

## Modification Rules

- Keep HTTP-provider details in client files and provider-independent rules/error mapping in services.
- Validate request parameters with local Zod schemas where inputs exist.
- Use shared integration constants and Persian application errors.
- Update colocated unit and integration tests when contracts change.

## Summary

- Integrations expose API routes but remain separate from business entities.
- Clients own remote HTTP calls; services own caching, mapping, and error translation.
