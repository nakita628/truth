---
'schema-truth': minor
---

TypeBox: an integer with `format: bigint` no longer carries its `default`, on the node or beside a `$ref` or `allOf` to one. A bigint `default` made the schema throw in `JSON.stringify`, so OpenAPI emission, Fastify route schemas and Ajv could not use it. `Value.Default` now leaves such a field empty.
