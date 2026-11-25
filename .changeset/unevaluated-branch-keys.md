---
'schema-truth': patch
---

Zod, Valibot, Effect and ArkType: `unevaluatedProperties` on an object now counts a key that its `if` / `then` / `else` or a `dependentSchemas` entry declares as evaluated where that branch applies: `if` and `then` keys when `if` passes, `else` keys when it fails, and a `dependentSchemas` entry's keys when its key is present. So `{ "a": 1, "b": 2 }` is no longer refused when `dependentSchemas.a` declares `b`. `additionalProperties` still reads only the object's own `properties` and `patternProperties`.
