---
'schema-truth': patch
---

Emit the TypeBox pattern of a boolean read from text (a query, path, header, cookie or form field) as a string that spells both cases of each letter, so the schema serializes to JSON Schema and an OpenAPI document shows the pattern instead of `{}`. The accepted spellings are unchanged.
