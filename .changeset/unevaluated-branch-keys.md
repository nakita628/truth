---
'schema-truth': patch
---

Zod, Valibot, Effect and ArkType: `unevaluatedProperties` on an object now counts the keys its `then`, `else` and `dependentSchemas` declare as evaluated, as JSON Schema 2020-12 does, so `{ "a": 1, "b": 2 }` is no longer refused when `dependentSchemas.a` declares `b`. `additionalProperties` still reads only the object's own `properties` and `patternProperties`.
