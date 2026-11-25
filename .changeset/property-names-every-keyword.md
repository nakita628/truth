---
'schema-truth': patch
---

Check more of a `propertyNames` schema in Zod, Valibot, Effect and ArkType: `pattern` together with `enum`, plus `const`, `minLength`, `maxLength`, and `propertyNames: false` (no key allowed). The key pattern gets the `u` flag that a Unicode escape needs, so `^\p{L}+$` matches letters.
