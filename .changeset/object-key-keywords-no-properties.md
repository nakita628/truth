---
'schema-truth': patch
---

An object with no `properties` keeps `minProperties`, `maxProperties`, `dependentRequired`, `dependentSchemas` and `if` / `then` / `else` in Zod, Valibot, Effect and ArkType, instead of becoming an empty object. `{ type: 'object', additionalProperties: true }` is now an open object (`z.looseObject({})`, `v.looseObject({})`, `Schema.Record(Schema.String, Schema.Unknown)`, `type({})`) rather than any value, and ArkType keeps undeclared keys whenever a check reads them. Effect keeps undeclared keys for `dependentSchemas`, as the other targets do.
