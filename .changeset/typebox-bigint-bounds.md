---
'schema-truth': patch
---

Emit numeric `exclusiveMinimum`, `exclusiveMaximum` and `multipleOf` on TypeBox's `Type.BigInt`, and write its bounds as plain numbers (`minimum:0.5`) instead of `BigInt(<number>)`, which threw on a fractional bound when the generated module loaded. TypeBox compares a bigint with a number bound directly, and the schema stays serializable. A fractional `multipleOf` reduces to the integer divisor that admits the same bigints (`2.5` becomes `5`), and a non-finite bound is left out.
