# oas-truth

## 0.8.0

### Minor Changes

- [#41](https://github.com/nakita628/truth/pull/41) [`fdc1341`](https://github.com/nakita628/truth/commit/fdc13417a12ae49a8d7df7bc8334698119443caf) Thanks [@nakita628](https://github.com/nakita628)! - Return types are inferred instead of declared. `oas-truth` no longer exports the `Result` type: `parseOpenAPI` still resolves to `{ ok: true, value } | { ok: false, error }`, now inferred from its returns, so code that imported `Result` should use `Awaited<ReturnType<typeof parseOpenAPI>>` or its own alias. `isOpenAPIInput` and the `OpenAPIInput` type are removed too (the input type is `Parameters<typeof parseOpenAPI>[0]`): `parseOpenAPI` still rejects an unsupported string with `{ ok: false, error }`, so pass the value to it and read the result. The emitted code does not change.

### Patch Changes

- Updated dependencies [[`fdc1341`](https://github.com/nakita628/truth/commit/fdc13417a12ae49a8d7df7bc8334698119443caf)]:
  - schema-truth@0.8.8

## 0.7.1

### Patch Changes

- [#32](https://github.com/nakita628/truth/pull/32) [`e1ec0c8`](https://github.com/nakita628/truth/commit/e1ec0c8ca6c53d2ae178eddcf0710f11e3065227) Thanks [@nakita628](https://github.com/nakita628)! - Annotate an Effect recursive declaration as `Schema.Codec<T, unknown>` instead of `Schema.Schema<T>`, so it decodes and passes to `Schema.toStandardSchemaV1` again, while a member that encodes differently (a property with a `default`) still type-checks.
