---
'schema-truth': patch
---

Zod, Valibot, Effect and ArkType: an object with no `properties` keeps `minProperties`, `maxProperties`, `dependentRequired`, `dependentSchemas` and `if` / `then` / `else` instead of becoming an empty object. `{ type: 'object', additionalProperties: true }` is now an open object (`z.looseObject({})`, `v.looseObject({})`, `Schema.Record(Schema.String, Schema.Unknown)`, `type({})`) rather than any value, and ArkType keeps undeclared keys whenever a check reads them. Effect keeps undeclared keys for `dependentSchemas`, as the other targets do. TypeBox and Yup are unchanged.
