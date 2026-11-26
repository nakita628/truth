---
'schema-truth': patch
---

A `__proto__` key in metadata schema-truth writes into generated code (`examples`, `externalDocs`, `.meta(...)`, `v.metadata(...)`, `.annotate(...)` and TypeBox metadata options) is now written as a computed key, so it stays an own property instead of setting the object's prototype. Defaults and schema property names are unchanged.
