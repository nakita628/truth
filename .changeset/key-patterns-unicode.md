---
'schema-truth': patch
---

Zod, Valibot, Effect and ArkType: `patternProperties` patterns and the evaluated-key checks for `additionalProperties` / `unevaluatedProperties` are now built like the string `pattern` keyword, so `\p{…}` and braced hex escapes get the `u` flag and match. So is ArkType's string `pattern` with an `x-pattern-message`. ArkType's index-signature keys beside an `allOf` are unchanged.
