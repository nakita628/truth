---
'schema-truth': patch
---

Check `dependentRequired`, `dependentSchemas` and an undeclared `required` key with `Object.hasOwn` and a JSON-quoted key in Zod, Valibot, Effect and ArkType. An entry named `constructor` or `toString` no longer applies to every object, and a key with `'` or `\` no longer emits a syntax error. The `if` schema in an `unevaluatedProperties` key check is now tested once per value instead of once per key.
