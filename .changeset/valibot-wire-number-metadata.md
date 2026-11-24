---
'schema-truth': patch
---

Valibot: annotate an `integer` / `number` parameter read from wire text with `v.metadata({ type, ...bounds })`, so a JSON Schema converter that documents the input side (`@valibot/to-json-schema` with `typeMode: 'input'`, as hono-openapi uses it) describes it as the spec's `integer` / `number` with its bounds, not only as a `string` with a `pattern`. Validation is unchanged.
