---
'schema-truth': patch
---

Emit numeric `exclusiveMinimum`, `exclusiveMaximum` and `multipleOf` on TypeBox's `Type.BigInt`, and write its bounds as bigint literals (`minimum:1n`) instead of `BigInt(<number>)`, which threw on a fractional bound when the generated module loaded.
