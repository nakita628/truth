# schema-truth

## 0.8.8

### Patch Changes

- [#41](https://github.com/nakita628/truth/pull/41) [`fdc1341`](https://github.com/nakita628/truth/commit/fdc13417a12ae49a8d7df7bc8334698119443caf) Thanks [@nakita628](https://github.com/nakita628)! - Return types are inferred instead of declared. `oas-truth` no longer exports the `Result` type: `parseOpenAPI` still resolves to `{ ok: true, value } | { ok: false, error }`, now inferred from its returns, so code that imported `Result` should use `Awaited<ReturnType<typeof parseOpenAPI>>` or its own alias. `isOpenAPIInput` and the `OpenAPIInput` type are removed too (the input type is `Parameters<typeof parseOpenAPI>[0]`): `parseOpenAPI` still rejects an unsupported string with `{ ok: false, error }`, so pass the value to it and read the result. The emitted code does not change.

## 0.8.7

### Patch Changes

- [#38](https://github.com/nakita628/truth/pull/38) [`b38c595`](https://github.com/nakita628/truth/commit/b38c595a22e6d6443f0d0a11873082b744479480) Thanks [@nakita628](https://github.com/nakita628)! - TypeBox: a number or integer read from text (query, path, header, cookie, form field) now carries its wire `pattern` as a string, so the schema serializes as valid JSON Schema, and checks its `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum` and `multipleOf` with `Type.Refine`.

## 0.8.6

### Patch Changes

- [#34](https://github.com/nakita628/truth/pull/34) [`64fba0e`](https://github.com/nakita628/truth/commit/64fba0e31ae49d00afaeaeb9c7fe93fcad0d28ba) Thanks [@nakita628](https://github.com/nakita628)! - Zod: read an `integer` / `number` parameter from wire text with `z.preprocess` instead of a `z.string().regex(...)` pipe, so a JSON Schema converter that documents the input side (hono-openapi's `validator`) describes it as the spec's `integer` / `number` with its bounds again, not as a `string` with a `pattern`. The strict text check is unchanged.
