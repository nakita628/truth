---
'schema-truth': minor
'oas-truth': minor
---

Valibot wire parameters are fully documented on the input side (`@valibot/to-json-schema` with `typeMode: 'input'`). A pipe that reads text through a transform now starts with `v.metadata(...)` holding the spec's own schema. This covers arrays, nullable parameters, booleans, literals, 64-bit integers and parameter objects. Number pipes also carry `format`, `description`, `examples` and `deprecated`.
