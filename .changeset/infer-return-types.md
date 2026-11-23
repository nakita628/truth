---
'oas-truth': minor
'schema-truth': patch
---

Return types are inferred instead of declared. `oas-truth` no longer exports the `Result` type: `parseOpenAPI` still resolves to `{ ok: true, value } | { ok: false, error }`, now inferred from its returns, so code that imported `Result` should use `Awaited<ReturnType<typeof parseOpenAPI>>` or its own alias. `isOpenAPIInput` and the `OpenAPIInput` type are removed too (the input type is `Parameters<typeof parseOpenAPI>[0]`): `parseOpenAPI` still rejects an unsupported string with `{ ok: false, error }`, so pass the value to it and read the result. The emitted code does not change.
