---
name: single-source-of-truth
description: Centralize repeated stable values, role groups, policy arrays, route fragments, and configuration vocabulary when creating or reviewing application code. Use for source changes and reviews that add, modify, or expose reusable constants.
---

# Single Source of Truth

Keep stable shared vocabulary defined once in its narrowest appropriate owner, then import and reuse it everywhere. This includes role groups, authorization policies, limits, status/error codes, route fragments, field names, repeated option arrays, and protocol values.

## Workflow

1. Before adding a stable literal or array, search for equivalent values and existing constants.
2. Reuse the existing constant when it has the same meaning. Do not create a local alias solely to re-export an existing shared value.
3. When the value has more than one consumer or represents shared business vocabulary, define it centrally in the relevant shared configuration module. Keep a value local only when its meaning and consumers are genuinely local.
4. Replace every equivalent consumer in the same change, preserving any intentionally different ordering or authorization semantics.
5. Search again for duplicate literals, arrays, and obsolete local aliases. Add or update focused tests when the shared value controls observable behavior.

## Authorization Role Groups

- Define cross-entity role groups in `src/configs/constants.js`.
- Pass those exported groups directly to `roleMiddleware`; do not recreate arrays such as `[ROLES.ADMIN, ROLES.SELLER]` in entity routes.
- Keep a single-role rule as `ROLES.<ROLE>` unless a named group adds a distinct reusable policy.

## Completion Check

Run targeted search for the replaced pattern and inspect the final diff. Do not claim centralization if equivalent literals or local aliases remain without an intentional, documented reason.
