# oas-truth

## 0.11.4

### Patch Changes

- Updated dependencies [[`1eae6ce`](https://github.com/nakita628/truth/commit/1eae6cebf6ca3a45bb7791a0c331a2f7855d0d9d)]:
  - schema-truth@0.14.0

## 0.11.3

### Patch Changes

- [#147](https://github.com/nakita628/truth/pull/147) [`70f4015`](https://github.com/nakita628/truth/commit/70f4015ad932bdd86890e34aaf4633b61cec9ab8) Thanks [@nakita628](https://github.com/nakita628)! - Keep a discriminator right across component identifier collisions: an unmapped member renamed by a collision (`FooBar2`) takes its schema key as its implicit value, and `mapping` targets follow the rename. A `$ref` beside a discriminated `oneOf` inside a `$ref` cycle is localized like any other node, and an ArkType cyclic file imports `type` only when its code calls it.

## 0.11.2

### Patch Changes

- Updated dependencies [[`21b2491`](https://github.com/nakita628/truth/commit/21b2491536dc60bc3c2d061e0ad92527dc2ed101)]:
  - schema-truth@0.13.0

## 0.11.1

### Patch Changes

- [#118](https://github.com/nakita628/truth/pull/118) [`4e416e2`](https://github.com/nakita628/truth/commit/4e416e261730ead6625c5ead923f7567e9f26c2a) Thanks [@nakita628](https://github.com/nakita628)! - A TypeBox `boolean` / `number` / `integer` parameter read from text, and every `date` node, now keeps its `description`, `examples` (as wire text), `deprecated`, `externalDocs`, `readOnly` and `writeOnly` on the inner `Type.String`. It also keeps a non-empty `x-error-message` / `x-pattern-message` as `errorMessage`.
- Updated dependencies [[`4e416e2`](https://github.com/nakita628/truth/commit/4e416e261730ead6625c5ead923f7567e9f26c2a)]:
  - schema-truth@0.12.1

## 0.11.0

### Minor Changes

- [#115](https://github.com/nakita628/truth/pull/115) [`6655334`](https://github.com/nakita628/truth/commit/66553348bc7690175bd7a39dff96339a2f1b9174) Thanks [@nakita628](https://github.com/nakita628)! - Valibot wire parameters are fully documented on the input side (`@valibot/to-json-schema` with `typeMode: 'input'`). A pipe that reads text through a transform now starts with `v.metadata(...)` holding the spec's own schema. This covers arrays, nullable parameters, booleans, literals, 64-bit integers and parameter objects. Number pipes also carry `format`, `description`, `examples` and `deprecated`.

### Patch Changes

- Updated dependencies [[`6655334`](https://github.com/nakita628/truth/commit/66553348bc7690175bd7a39dff96339a2f1b9174)]:
  - schema-truth@0.12.0

## 0.10.0

### Minor Changes

- [#111](https://github.com/nakita628/truth/pull/111) [`20ebf40`](https://github.com/nakita628/truth/commit/20ebf40225ac1915d92c0429fa5704d2ecac0cbc) Thanks [@nakita628](https://github.com/nakita628)! - A `discriminator` member that no `mapping` entry names, has no `const` / `enum` of its own, and whose schema name is already a `mapping` key for another schema now keeps no discriminator constraint, instead of taking that name (or, inside an ArkType `scope` / TypeBox `Type.Cyclic`, the local alias such as `CompoundFilterSchema`) as its value.

### Patch Changes

- Updated dependencies [[`20ebf40`](https://github.com/nakita628/truth/commit/20ebf40225ac1915d92c0429fa5704d2ecac0cbc)]:
  - schema-truth@0.11.0

## 0.9.0

### Minor Changes

- [#108](https://github.com/nakita628/truth/pull/108) [`deb6978`](https://github.com/nakita628/truth/commit/deb69785651a44c5273f2cedc8c906799e4d182f) Thanks [@nakita628](https://github.com/nakita628)! - A `discriminator` member that no `mapping` entry names now takes the values its own discriminator property is held to (`const` or `enum` strings) instead of its schema name, in every generator, less any value another member, a mapping key or another member's schema name also claims, and falls back to the schema name when none is left. This departs from the OpenAPI specification's implicit mapping on purpose: a document such as OpenAI's `CompoundFilter`, whose member declares `type: { enum: [eq, ne] }`, now validates as intended, and ArkType no longer throws at load.

### Patch Changes

- Updated dependencies [[`deb6978`](https://github.com/nakita628/truth/commit/deb69785651a44c5273f2cedc8c906799e4d182f)]:
  - schema-truth@0.10.0

## 0.8.2

### Patch Changes

- Updated dependencies [[`9bf2913`](https://github.com/nakita628/truth/commit/9bf2913ce39aefc808cceb946142cc597d9c050d), [`c4eabb4`](https://github.com/nakita628/truth/commit/c4eabb449511227067b25da1f42af95f66f6edf3)]:
  - schema-truth@0.9.0

## 0.8.1

### Patch Changes

- [#71](https://github.com/nakita628/truth/pull/71) [`29d9339`](https://github.com/nakita628/truth/commit/29d9339cee2f6fed729b259dff93a23b289f9741) Thanks [@nakita628](https://github.com/nakita628)! - ArkType: inside `scope({...})` (a document with `$defs`, or an oas-truth `$ref` cycle), an array whose items are a tuple or object definition is now the tuple expression `[items, "[]"]` instead of the global `type(items).array()`, which could not resolve the scope's aliases. oas-truth keeps the schema name (`'CompoundFilter'`) as the implicit discriminator value of a member of a cycle, instead of its scope alias.
- Updated dependencies [[`29d9339`](https://github.com/nakita628/truth/commit/29d9339cee2f6fed729b259dff93a23b289f9741)]:
  - schema-truth@0.8.15

## 0.8.0

### Minor Changes

- [#41](https://github.com/nakita628/truth/pull/41) [`fdc1341`](https://github.com/nakita628/truth/commit/fdc13417a12ae49a8d7df7bc8334698119443caf) Thanks [@nakita628](https://github.com/nakita628)! - Return types are inferred instead of declared. `oas-truth` no longer exports the `Result` type: `parseOpenAPI` still resolves to `{ ok: true, value } | { ok: false, error }`, now inferred from its returns, so code that imported `Result` should use `Awaited<ReturnType<typeof parseOpenAPI>>` or its own alias. `isOpenAPIInput` and the `OpenAPIInput` type are removed too (the input type is `Parameters<typeof parseOpenAPI>[0]`): `parseOpenAPI` still rejects an unsupported string with `{ ok: false, error }`, so pass the value to it and read the result. The emitted code does not change.

### Patch Changes

- Updated dependencies [[`fdc1341`](https://github.com/nakita628/truth/commit/fdc13417a12ae49a8d7df7bc8334698119443caf)]:
  - schema-truth@0.8.8

## 0.7.1

### Patch Changes

- [#32](https://github.com/nakita628/truth/pull/32) [`e1ec0c8`](https://github.com/nakita628/truth/commit/e1ec0c8ca6c53d2ae178eddcf0710f11e3065227) Thanks [@nakita628](https://github.com/nakita628)! - Annotate an Effect recursive declaration as `Schema.Codec<T, unknown>` instead of `Schema.Schema<T>`, so it decodes and passes to `Schema.toStandardSchemaV1` again, while a member that encodes differently (a property with a `default`) still type-checks.
