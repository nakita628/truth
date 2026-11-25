---
'schema-truth': patch
---

ArkType: inside a `scope`, a `prefixItems` tuple is now a definition (`["A"]`) instead of the global `type(["A"])`, which could not resolve the scope's aliases, and a `$ref` beside `type: 'array'` emits `"A[]"` instead of `"A".array()`, which threw a `TypeError` when the module loaded.
