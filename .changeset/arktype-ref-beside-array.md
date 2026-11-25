---
'schema-truth': patch
---

ArkType: a `$ref` beside `type: 'array'` now checks both the referenced schema and the array built from its own keywords (`minItems`, `maxItems`, `uniqueItems`, `contains`, the item's `nullable` and `description`), also when the type is `['array', 'null']`.
