---
'schema-truth': patch
---

Check every keyword of a `propertyNames` schema in Zod, Valibot, Effect and ArkType: `pattern` together with `enum`, `const`, and `propertyNames: false` (no key allowed). The key pattern is now a regular-expression literal with the `u` flag a Unicode escape needs, so `^\p{L}+$` matches letters.
