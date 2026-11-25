---
'schema-truth': patch
'oas-truth': patch
---

A TypeBox `boolean` / `number` / `integer` / date parameter read from text now keeps its `description`, `examples`, `deprecated`, `readOnly` and `writeOnly` on the wire `Type.String`. It also keeps its `x-error-message` / `x-pattern-message` as `errorMessage`.
