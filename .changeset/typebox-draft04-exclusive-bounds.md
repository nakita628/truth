---
'schema-truth': patch
---

TypeBox: honor a draft-04 boolean `exclusiveMinimum` / `exclusiveMaximum` outside a parameter. `{ minimum: 0, exclusiveMinimum: true }` now emits `Type.Integer({exclusiveMinimum:0})` instead of `Type.Integer({minimum:0})`, which accepted `0`; `x-minimum-message` / `x-maximum-message` follow the bound to the exclusive keyword.
