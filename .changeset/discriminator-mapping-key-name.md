---
'schema-truth': minor
'oas-truth': minor
---

A `discriminator` member that no `mapping` entry names, has no `const` / `enum` of its own, and whose schema name is already a `mapping` key for another schema now keeps no discriminator constraint, instead of taking that name (or, inside an ArkType `scope` / TypeBox `Type.Cyclic`, the local alias such as `CompoundFilterSchema`) as its value.
