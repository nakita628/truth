---
'schema-truth': patch
---

For `format: bigint`, `int64` and `uint64` in Zod, Valibot, ArkType and Effect, a fractional bound is rounded and a fractional `multipleOf` reduced to an integer, so the generated module no longer throws a `RangeError` (or fails to parse) on load. A zero `multipleOf` is left out, and a negative one is checked by its absolute value (in TypeBox too).
