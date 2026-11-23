---
'schema-truth': patch
---

Emit numeric `exclusiveMinimum`, `exclusiveMaximum` and `multipleOf` on TypeBox's `Type.BigInt`, and write its bounds as integer numbers instead of `BigInt(<number>)`, which threw on a fractional bound when the generated module loaded. A fractional bound rounds to the integer that admits the same bigints (`minimum: 0.5` becomes `minimum:1`), and the schema stays serializable. A fractional `multipleOf` reduces to the integer divisor that admits the same bigints (`2.5` becomes `5`), and a non-finite bound or a divisor a number cannot hold exactly is left out.
