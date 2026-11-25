---
'schema-truth': patch
---

Ignore an `unevaluatedProperties` beside `additionalProperties` in Zod, Valibot, Effect and ArkType, as JSON Schema 2020-12 does: `additionalProperties` evaluates every remaining key, so `unevaluatedProperties: false` no longer closes such an object.
