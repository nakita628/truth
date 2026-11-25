---
'schema-truth': minor
---

TypeBox: an integer with `format: bigint` no longer carries its `default`, on the node or beside a `$ref` or `allOf` to one (a parameter read from text keeps it as its text). A bigint `default` made the schema throw in `JSON.stringify`, so OpenAPI emission, Fastify route schemas and Ajv could not use it. `Value.Default` now leaves such a field empty, and a required key with such a default is no longer `Type.Optional`, so input that omits it fails `Value.Check`.
