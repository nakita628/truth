---
'schema-truth': patch
---

Zod, Valibot, Effect and ArkType: a keyword-only `allOf` member that no sibling absorbs is now checked one keyword at a time, each check with its own message falling back to `x-error-message`. `{ minimum: 5, maximum: 9, 'x-minimum-message': 'low', 'x-maximum-message': 'high' }` now reports "high" for 10, where it used to report "low" for any failure.
