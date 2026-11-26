---
'schema-truth': patch
---

TypeBox: `Type.Integer` and `Type.Number` now carry the range of an `int32`, `uint32`, `float` or `float32` format as `minimum` / `maximum`, so they reject what the other targets reject. Where the schema's own bound on a side is looser, the format's bound replaces it, and an out-of-range value reports `x-error-message` rather than that bound's message. `Value.Create` now starts such a field at the format's minimum when the schema sets no lower bound of its own.
