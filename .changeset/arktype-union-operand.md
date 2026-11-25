---
'schema-truth': patch
---

ArkType: a quoted union is now parenthesized where it is an operand of `[]` or `&`: an array of an enum or a nullable item emits `"('a' | 'b')[]"` instead of `"'a' | 'b'[]"`, which ArkType read as `'a' | ('b'[])`, and an `allOf` of unions emits `"(string | number) & (string | number)"`. A union rest after `prefixItems` no longer throws `Spread element must be an array` when the module loads.
