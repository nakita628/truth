---
'schema-truth': patch
'oas-truth': patch
---

A TypeBox `boolean` / `number` / `integer` parameter read from text, and every `date` node, now keeps its `description`, `examples` (as wire text), `deprecated`, `externalDocs`, `readOnly` and `writeOnly` on the inner `Type.String`. It also keeps a non-empty `x-error-message` / `x-pattern-message` as `errorMessage`.
