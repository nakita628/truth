---
'schema-truth': patch
---

Check `propertyNames` on an object that declares no `properties` and no `additionalProperties` schema (or `additionalProperties: true`) in Zod, Valibot, Effect and ArkType, which emitted an empty object that took any key.
