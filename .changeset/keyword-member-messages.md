---
'schema-truth': patch
---

Zod, Valibot, Effect and ArkType: a keyword-only `allOf` member that no sibling absorbs is now checked once per distinct message its keywords report (each keyword's own, else `x-error-message`), so keywords sharing a message are reported once. `{ minimum: 5, maximum: 9, 'x-minimum-message': 'low', 'x-maximum-message': 'high' }` now reports "high" for 10, where it used to report "low" for any failure.
