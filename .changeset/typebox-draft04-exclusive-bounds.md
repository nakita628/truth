---
'schema-truth': patch
---

TypeBox: honor a draft-04 boolean `exclusiveMinimum` / `exclusiveMaximum` outside a parameter. `{ minimum: 0, exclusiveMinimum: true }` now emits `Type.Integer({exclusiveMinimum:0})` instead of `Type.Integer({minimum:0})`, which accepted `0`. Its message is `x-exclusiveMinimum-message` / `x-exclusiveMaximum-message`, as in a parameter and in the other targets.
