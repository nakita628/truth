---
'schema-truth': patch
---

Check `dependentRequired` and `dependentSchemas` with `Object.hasOwn` and a JSON-quoted key in Zod, Valibot, Effect and ArkType, and an undeclared `required` key the same way in Zod, Valibot and Effect. An entry named `toString` no longer applies to every object, and a key with `'` or `\` no longer emits a syntax error. Names the object drops before the check (`constructor`, `prototype` and `__proto__` in Valibot, `__proto__` in Zod) keep the `in` test, so a value that sends them is still accepted. An empty `dependentRequired` list no longer emits code that fails to parse, and the `if` schema in an `unevaluatedProperties` key check is now tested once per value instead of once per key.
