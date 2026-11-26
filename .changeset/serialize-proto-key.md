---
'schema-truth': patch
---

A `__proto__` key in a value schema-truth writes into generated code (metadata such as `examples`, `externalDocs`, Valibot `v.metadata(...)` and TypeBox options) is now written as a computed key, so it stays an own property instead of setting the object's prototype.
