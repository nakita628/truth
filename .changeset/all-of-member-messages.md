---
'schema-truth': patch
---

Keep a keyword-only `allOf` member's custom message when it is folded into a sibling. On an equal bound, length, pattern or `multipleOf`, a sibling without its own message takes the member's. A member's `x-error-message` now reports the checks it adds instead of being dropped.
