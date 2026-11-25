---
'schema-truth': patch
---

Zod, Valibot, Effect and ArkType: a `propertyNames` `enum` with no string member, such as `[]`, now emits `Object.keys(…).length===0`, and one with non-string members looks a key up only among its strings. The emitted `[].includes(key)` or number-array lookup failed to type-check (TS2345).
