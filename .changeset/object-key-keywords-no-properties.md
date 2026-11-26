---
'schema-truth': patch
---

Zod, Valibot, Effect and ArkType: an object with no `properties` (a record from an `additionalProperties` schema included) keeps `minProperties`, `maxProperties`, `dependentRequired`, `dependentSchemas` and `if` / `then` / `else` instead of dropping them. `{ type: 'object', additionalProperties: true }` is now an open object (`z.looseObject({})`, `v.looseObject({})`, `Schema.Record(Schema.String, Schema.Unknown)`, `type({})`) rather than any value; like every Zod and Valibot object, it drops the keys those libraries strip (`__proto__`, and in Valibot `constructor` and `prototype`), which key counts then do not see (#130). ArkType keeps undeclared keys whenever a check reads them, and Effect keeps them for `dependentSchemas`, as the other targets do. TypeBox and Yup are unchanged.
