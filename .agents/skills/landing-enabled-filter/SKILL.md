---
name: landing-enabled-filter
description: Keep public landing queries from returning disabled records. Use when adding or changing a landing list, selector, aggregation, or lookup backed by an entity model with an enabled-state field.
---

# Landing enabled-record filtering

Public landing data must not expose disabled catalog records.

Before changing a landing query, inspect the queried model and identify its actual enabled-state field. If that model defines `isEnable`, every list, selector, fallback, slug lookup, and aggregate result that returns that model must require:

```js
isEnable: true
```

For aggregation pipelines, apply the equivalent predicate to the correct document stage:

- Filter the root collection before grouping or sorting when it is the returned entity.
- After a `$lookup` and `$unwind`, filter joined records with the qualified path, for example `{ $match: { 'product.isEnable': true } }`.
- Apply the filter before `$limit`, so a disabled record cannot consume a result slot.

Do not assume every model uses the same field name. Preserve an inspected model's own contract, such as `inEnable` or `isEnabled`, instead of adding an `isEnable` predicate to a model that does not define it.

When a landing response can be sourced by more than one query, apply the enabled-state predicate to every branch, including fallback and duplicate-exclusion paths.

Add or update an integration test with a disabled record that would otherwise rank or match. Assert that it is absent from the public response. This rule only changes database predicates and does not create long-lived resources.
