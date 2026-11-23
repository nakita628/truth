---
'schema-truth': patch
---

Round a fractional bound and reduce a fractional `multipleOf` to an integer for `format: bigint`, `int64` and `uint64` in Zod, Valibot, ArkType and Effect, so the generated module no longer throws a `RangeError` (or fails to parse) on load, and leave out a zero or negative divisor. A TypeBox `Type.BigInt` default is now written as a bigint.
