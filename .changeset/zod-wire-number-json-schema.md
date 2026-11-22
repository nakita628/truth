---
'schema-truth': patch
---

Zod: read an `integer` / `number` parameter from wire text with `z.preprocess` instead of a `z.string().regex(...)` pipe, so a JSON Schema converter that documents the input side (hono-openapi's `validator`) describes it as the spec's `integer` / `number` with its bounds again, not as a `string` with a `pattern`. The strict text check is unchanged.
