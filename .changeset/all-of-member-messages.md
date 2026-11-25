---
'schema-truth': patch
---

Keep a keyword-only `allOf` member's custom message when it is folded into a sibling. On an equal bound, length, pattern or `multipleOf`, a sibling without its own message for that keyword takes the member's, and a member that tightens a length no longer keeps the sibling's message for the looser one. A member's `x-error-message` now reports the checks it adds instead of being dropped, and leftover members with different messages are no longer merged into one check.
