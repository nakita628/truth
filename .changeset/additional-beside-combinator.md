---
'schema-truth': minor
---

Zod, Valibot and ArkType: `additionalProperties` beside `allOf` / `anyOf` / `oneOf` is now applied, holding the keys the node's own `properties` and `patternProperties` leave, as JSON Schema reads it. It used to be ignored, so `{ allOf: [...], additionalProperties: false }` accepted any key. Breaking: data that used to validate can now be rejected. For example, `allOf: [{ $ref: Base }], additionalProperties: false` now refuses the keys of `Base` that the node's own `properties` do not name, as the spec says. Effect is unchanged (#177).
