---
'schema-truth': patch
---

`allOf` bound folding now keeps the stricter of a member's `minimum` and numeric `exclusiveMinimum` (and of `maximum` and `exclusiveMaximum`) instead of only the exclusive one: `allOf: [{ type: 'number', minimum: 0 }, { minimum: 10, exclusiveMinimum: 5 }]` emits `z.number().min(10)` rather than `.gt(5)`, which accepted `7`. Every target is affected. The member's custom message carries over to whichever bound wins.
