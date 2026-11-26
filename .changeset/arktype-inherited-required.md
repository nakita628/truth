---
'schema-truth': patch
---

ArkType: a required key named like an `Object.prototype` member (`toString`, `constructor`, …) is now checked as an own key, so `{ type: 'object', required: ['toString'] }` refuses `{}` as Zod, Valibot and Effect do. It used to pass, because ArkType found the inherited member.
