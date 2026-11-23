---
'schema-truth': patch
---

Emit numeric `exclusiveMinimum`, `exclusiveMaximum` and `multipleOf` on TypeBox's `Type.BigInt`, and write its bounds as bigint literals (`minimum:1n`) instead of `BigInt(<number>)`, which threw on a fractional bound when the generated module loaded. A fractional `multipleOf` reduces to the integer divisor that admits the same bigints (`2.5` becomes `5n`), and a non-finite bound is left out.
