---
'schema-truth': patch
---

TypeBox: a number or integer read from text (query, path, header, cookie, form field) now carries its wire `pattern` as a string, so the schema serializes as valid JSON Schema, and checks its `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum` and `multipleOf` with `Type.Refine`.
