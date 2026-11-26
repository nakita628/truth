---
'schema-truth': patch
---

Zod, Valibot and ArkType: `additionalProperties` beside `allOf` / `anyOf` / `oneOf` is now applied, holding the keys the node's own `properties` and `patternProperties` leave, as JSON Schema reads it. It used to be ignored, so `{ allOf: [...], additionalProperties: false }` accepted any key. Effect is unchanged.
