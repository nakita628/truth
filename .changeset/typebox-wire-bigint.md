---
'schema-truth': minor
---

Decode an `int64`, `uint64` or `bigint` integer on the TypeBox wire of a text-slot parameter with `BigInt`, as the other generators' wires do, and check the `int64` / `uint64` range. The decoded type of such a parameter changes from `number` to `bigint`, text beyond the safe integer range is accepted rather than rejected, the text grammar is a sign and digits (`007` is accepted, as the other generators accept it), and a default is written in digits (`1e21` no longer becomes the text `1e+21`). A TypeBox body field of `int64` / `uint64` is still a `Type.Integer`.
