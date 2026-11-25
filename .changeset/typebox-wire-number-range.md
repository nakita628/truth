---
'schema-truth': patch
---

TypeBox: a `number` read from text (query, path, header, cookie) now rejects text that overflows to `Infinity`, such as `1e999`, and an `integer` read from text rejects text beyond the safe integer range, such as `9007199254740993`, which `Number` would round. The other generators already reject both.
