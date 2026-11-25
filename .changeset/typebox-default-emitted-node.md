---
'schema-truth': patch
---

Read a TypeBox `default` by the node that is actually emitted: a union with a `format: bigint` member writes a number default for a member that takes it (`"5"` for a string member) instead of one `Type.BigInt` rejects, and a node of several types writes it for the first type TypeBox emits (`type: ['integer', 'string']` is a `Type.String` with the default `"5"`).
