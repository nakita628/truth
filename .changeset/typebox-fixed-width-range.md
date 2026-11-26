---
'schema-truth': patch
---

TypeBox: `Type.Integer` and `Type.Number` now carry the range of an `int32`, `uint32`, `float` or `float32` format as `minimum` / `maximum`, taking the tighter of the format's bound and the schema's own, so they reject what the other targets reject.
