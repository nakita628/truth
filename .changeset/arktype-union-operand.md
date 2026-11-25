---
'schema-truth': patch
---

ArkType: a quoted union that is an operand of `[]` or `&` is now combined at runtime instead of being glued into one string: an array of an enum or a nullable item emits `type("'a' | 'b'").array()` instead of `"'a' | 'b'[]"`, which ArkType read as `'a' | ('b'[])`, and an `allOf` of unions emits `type("string | number").and("string | number")` instead of a string that read as `string | (number & string) | number`. A union rest after `prefixItems` no longer throws `Spread element must be an array` when the module loads.
