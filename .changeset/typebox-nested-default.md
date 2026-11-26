---
'schema-truth': patch
---

TypeBox: an object default's properties and an array default's items are now read against the node TypeBox emits for them, so a property or item of several types (`['integer', 'string']`, emitted as `Type.String`) gets the default `"5"` that `Value.Default` fills and the check accepts, rather than `5`.
