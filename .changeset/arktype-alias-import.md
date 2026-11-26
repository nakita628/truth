---
'oas-truth': patch
---

ArkType: a non-cyclic split file now imports `type` only when its code calls it. A file that calls neither `type` nor `scope`, such as a `$ref` alias (`export const FooSchema=BarSchema`), gets no `arktype` import, and `importLine` is `''`. It used to always import `type`, which failed `noUnusedLocals` (TS6133).
