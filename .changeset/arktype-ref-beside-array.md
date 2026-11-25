---
'schema-truth': patch
---

ArkType: a `$ref` beside `type: 'array'` (or `['array', 'null']`) now checks both the referenced schema and the array built from its own keywords (`minItems`, `maxItems`, `uniqueItems`, `contains`, the item's `nullable` and `description`). An array whose items read their input (wire coercion, `int64`) is read first and then checked against the target.
