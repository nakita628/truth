---
'schema-truth': minor
---

ArkType: a `prefixItems` tuple now follows JSON Schema 2020-12. Its positions are optional, the elements after it are open unless `items` or `unevaluatedItems` holds them (`false` closes the tuple), and `minItems`, `maxItems`, `uniqueItems`, `contains` and `x-items-message` beside it apply. A wire parameter tuple inside a scope now resolves the scope's aliases.
