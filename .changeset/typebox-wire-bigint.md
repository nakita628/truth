---
'schema-truth': minor
---

Decode an `int64`, `uint64` or `bigint` integer on the TypeBox wire of a text-slot parameter with `BigInt`, as the other generators do, and check the `int64` / `uint64` range. The decoded type of such a parameter changes from `number` to `bigint`, and text beyond the safe integer range is accepted rather than rejected.
