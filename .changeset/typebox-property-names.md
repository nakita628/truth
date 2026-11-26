---
'schema-truth': patch
---

TypeBox: `propertyNames` now checks the keys. A key schema with no type (`{ pattern }`, `{ enum }`, `{ minLength }`) is read as a string schema instead of `Type.Any()`, and `propertyNames: false` or an empty `enum` emits `Type.Never()`.
