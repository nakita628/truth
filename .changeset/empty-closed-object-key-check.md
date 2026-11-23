---
'schema-truth': patch
---

Stop emitting `[].includes(key)`, which does not type-check, for a closed object that names no property: Effect checks `Object.keys(input).length===0` instead, and every target leaves the empty name lookup out of its undeclared-key check.
