---
'schema-truth': patch
---

TypeBox: `propertyNames` now checks the keys. A key schema with no type (`{ pattern }`, `{ minLength }`, members of an `anyOf` / `oneOf` / `allOf`) is read as a string schema instead of `Type.Any()`, an `enum` / `const` keeps only its string values, and `propertyNames: false` or a key enum with no string value emits `Type.Never()`.
