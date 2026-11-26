---
'schema-truth': patch
---

Zod, Valibot, Effect and ArkType: `patternProperties` patterns, the evaluated-key checks for `additionalProperties` / `unevaluatedProperties`, and ArkType's messaged string `pattern` are now built like the string `pattern` keyword, so `\p{…}` and braced hex escapes get the `u` flag and match.
