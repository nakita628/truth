---
'schema-truth': patch
---

Stop emitting `[].includes(key)`, which does not type-check, when an object's undeclared-key check has no property name to look up. When no property or pattern covers any key, every target now checks `Object.keys(…).length === 0` or holds each of `Object.values(…)` to the extra-key schema, so the Effect output for `{ "type": "object", "properties": {}, "additionalProperties": false }` type-checks.
