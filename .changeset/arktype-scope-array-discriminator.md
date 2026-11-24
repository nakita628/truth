---
'schema-truth': patch
'oas-truth': patch
---

ArkType: an array whose items are not a quoted definition, inside a recursive `scope({...})`, is now the tuple expression `[items, "[]"]` instead of the global `type(items).array()`, which could not resolve the scope's aliases. oas-truth keeps the schema name (`'CompoundFilter'`) as the implicit discriminator value of a member of a cycle, instead of its scope alias.
