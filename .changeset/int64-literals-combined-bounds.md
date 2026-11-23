---
'schema-truth': patch
---

Spell an int64 or bigint `default`, `enum` member and `const` of `1e21` or more in digits (`1000000000000000000000n`, not the unparsable `1e+21n`), and drop a fractional default there. Zod, Valibot, Effect and ArkType now check `minimum` together with a numeric `exclusiveMinimum` (and `maximum` with `exclusiveMaximum`) instead of dropping the exclusive bound. A `default` beside a `$ref`, `allOf` or nullable `anyOf` whose target is a 64-bit or bigint integer is written as a bigint in Zod, Valibot, Effect and TypeBox, so TypeBox's `Value.Default` no longer fills a number that `Type.BigInt` rejects; such a TypeBox schema no longer goes through `JSON.stringify`.
