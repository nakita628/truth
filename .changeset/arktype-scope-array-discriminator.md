---
'schema-truth': patch
'oas-truth': patch
---

ArkType: inside `scope({...})` (a document with `$defs`, or an oas-truth `$ref` cycle), an array whose items are a tuple or object definition is now the tuple expression `[items, "[]"]` instead of the global `type(items).array()`, which could not resolve the scope's aliases. oas-truth keeps the schema name (`'CompoundFilter'`) as the implicit discriminator value of a member of a cycle, instead of its scope alias.
