---
'oas-truth': patch
---

Annotate an Effect recursive declaration as `Schema.Codec<T, unknown>` instead of `Schema.Schema<T>`, so it decodes and passes to `Schema.toStandardSchemaV1` again, while a member that encodes differently (a property with a `default`) still type-checks.
