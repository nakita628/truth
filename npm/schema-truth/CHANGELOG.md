# schema-truth

## 0.10.0

### Minor Changes

- [#108](https://github.com/nakita628/truth/pull/108) [`deb6978`](https://github.com/nakita628/truth/commit/deb69785651a44c5273f2cedc8c906799e4d182f) Thanks [@nakita628](https://github.com/nakita628)! - A `discriminator` member that no `mapping` entry names now takes the values its own discriminator property is held to (`const` or `enum` strings) instead of its schema name, in every generator, less any value another member, a mapping key or another member's schema name also claims, and falls back to the schema name when none is left. This departs from the OpenAPI specification's implicit mapping on purpose: a document such as OpenAI's `CompoundFilter`, whose member declares `type: { enum: [eq, ne] }`, now validates as intended, and ArkType no longer throws at load.

## 0.9.5

### Patch Changes

- [#104](https://github.com/nakita628/truth/pull/104) [`e07eb5d`](https://github.com/nakita628/truth/commit/e07eb5d4a4fae060a76fcfbf33364bf345d21da8) Thanks [@nakita628](https://github.com/nakita628)! - ArkType: inside a `scope`, a `prefixItems` tuple is now a definition (`["A"]`) instead of the global `type(["A"])`, which could not resolve the scope's aliases, and a `$ref` beside `type: 'array'` emits `"A[]"` instead of `"A".array()`, which threw a `TypeError` when the module loaded.

## 0.9.4

### Patch Changes

- [#99](https://github.com/nakita628/truth/pull/99) [`3711c85`](https://github.com/nakita628/truth/commit/3711c85e8a85703cd6e92f0c88cec6b4236504d0) Thanks [@nakita628](https://github.com/nakita628)! - `allOf` bound folding now keeps the stricter of a member's `minimum` and numeric `exclusiveMinimum` (and of `maximum` and `exclusiveMaximum`) instead of only the exclusive one: `allOf: [{ type: 'number', minimum: 0 }, { minimum: 10, exclusiveMinimum: 5 }]` emits `z.number().min(10)` rather than `.gt(5)`, which accepted `7`. Every target is affected. The member's custom message carries over to whichever bound wins.

## 0.9.3

### Patch Changes

- [#97](https://github.com/nakita628/truth/pull/97) [`b08e71a`](https://github.com/nakita628/truth/commit/b08e71a6734930e35db3ea53dd0403203aec874c) Thanks [@nakita628](https://github.com/nakita628)! - ArkType: a quoted union that is an operand of `[]` or `&` is now combined at runtime instead of being glued into one string: an array of an enum or a nullable item emits `type("'a' | 'b'").array()` instead of `"'a' | 'b'[]"`, which ArkType read as `'a' | ('b'[])`, and an `allOf` of unions emits `type("string | number").and("string | number")` instead of a string that read as `string | (number & string) | number`. A union rest after `prefixItems` no longer throws `Spread element must be an array` when the module loads.

## 0.9.2

### Patch Changes

- [#92](https://github.com/nakita628/truth/pull/92) [`5168285`](https://github.com/nakita628/truth/commit/5168285d5493ef37d514532377510452b0dca6b2) Thanks [@nakita628](https://github.com/nakita628)! - Zod, Valibot, Effect and ArkType: `unevaluatedProperties` on an object now counts a key that its `if` / `then` / `else` or a `dependentSchemas` entry declares as evaluated where that branch applies: `if` and `then` keys when `if` passes, `else` keys when it fails, and a `dependentSchemas` entry's keys when its key is present. So `{ "a": 1, "b": 2 }` is no longer refused when `dependentSchemas.a` declares `b`. `additionalProperties` still reads only the object's own `properties` and `patternProperties`.

## 0.9.1

### Patch Changes

- [#89](https://github.com/nakita628/truth/pull/89) [`d176510`](https://github.com/nakita628/truth/commit/d1765102ad2559a57bf59975764050c8e9c84e23) Thanks [@nakita628](https://github.com/nakita628)! - Zod, Valibot, Effect and ArkType: a `propertyNames` `enum` with no string member, such as `[]`, now emits `Object.keys(…).length===0`, and one with non-string members looks a key up only among its strings. The emitted `[].includes(key)` or number-array lookup failed to type-check (TS2345).

## 0.9.0

### Minor Changes

- [#85](https://github.com/nakita628/truth/pull/85) [`9bf2913`](https://github.com/nakita628/truth/commit/9bf2913ce39aefc808cceb946142cc597d9c050d) Thanks [@nakita628](https://github.com/nakita628)! - TypeBox: an integer with `format: bigint` no longer carries its `default`, on the node or beside a `$ref` or `allOf` to one (a parameter read from text keeps it as its text). A bigint `default` made the schema throw in `JSON.stringify`, so OpenAPI emission, Fastify route schemas and Ajv could not use it. `Value.Default` now leaves such a field empty, and a required key with such a default is no longer `Type.Optional`, so input that omits it fails `Value.Check`.

### Patch Changes

- [#82](https://github.com/nakita628/truth/pull/82) [`c4eabb4`](https://github.com/nakita628/truth/commit/c4eabb449511227067b25da1f42af95f66f6edf3) Thanks [@nakita628](https://github.com/nakita628)! - TypeBox: a `number` read from text (query, path, header, cookie) now rejects text that overflows to `Infinity`, such as `1e999`, and an `integer` read from text rejects text beyond the safe integer range, such as `9007199254740993`, which `Number` would round, as Zod, Valibot, Effect and ArkType already do. This includes an `int64`, `uint64` or `bigint` integer, which the TypeBox wire decodes to a `number`.

## 0.8.17

### Patch Changes

- [#79](https://github.com/nakita628/truth/pull/79) [`45d4530`](https://github.com/nakita628/truth/commit/45d45304517d7758a2b12be622c7785d22739bf8) Thanks [@nakita628](https://github.com/nakita628)! - Emit the TypeBox pattern of a boolean read from text (a query, path, header, cookie or form field) as a string that spells both cases of each letter, so the schema serializes to JSON Schema and an OpenAPI document shows the pattern instead of `{}`. The accepted spellings are unchanged.

## 0.8.16

### Patch Changes

- [#76](https://github.com/nakita628/truth/pull/76) [`235f3ac`](https://github.com/nakita628/truth/commit/235f3ac05b5b0b6e074d9decc3b543c4d1f95ca3) Thanks [@nakita628](https://github.com/nakita628)! - Valibot: annotate an `integer` / `number` parameter read from wire text with `v.metadata({ type, ...bounds })`, so a JSON Schema converter that documents the input side (`@valibot/to-json-schema` with `typeMode: 'input'`, as hono-openapi uses it) describes it as the spec's `integer` / `number` with its bounds, not only as a `string` with a `pattern`. Validation is unchanged.

## 0.8.15

### Patch Changes

- [#71](https://github.com/nakita628/truth/pull/71) [`29d9339`](https://github.com/nakita628/truth/commit/29d9339cee2f6fed729b259dff93a23b289f9741) Thanks [@nakita628](https://github.com/nakita628)! - ArkType: inside `scope({...})` (a document with `$defs`, or an oas-truth `$ref` cycle), an array whose items are a tuple or object definition is now the tuple expression `[items, "[]"]` instead of the global `type(items).array()`, which could not resolve the scope's aliases. oas-truth keeps the schema name (`'CompoundFilter'`) as the implicit discriminator value of a member of a cycle, instead of its scope alias.

## 0.8.14

### Patch Changes

- [#68](https://github.com/nakita628/truth/pull/68) [`2a21bc5`](https://github.com/nakita628/truth/commit/2a21bc52f709d3fca87bf611e2c96dca18aa6e16) Thanks [@nakita628](https://github.com/nakita628)! - Spell an int64 or bigint `default`, `enum` member and `const` of `1e21` or more in digits (`1000000000000000000000n`, not the unparsable `1e+21n`), and drop a fractional default there. Zod, Valibot, Effect and ArkType now check `minimum` together with a numeric `exclusiveMinimum` (and `maximum` with `exclusiveMaximum`) instead of dropping the exclusive bound. A `default` beside a `$ref`, `allOf` or nullable `anyOf` whose target is a 64-bit or bigint integer is written as a bigint in Zod, Valibot, Effect and TypeBox, so TypeBox's `Value.Default` no longer fills a number that `Type.BigInt` rejects; such a TypeBox schema no longer goes through `JSON.stringify`.

## 0.8.13

### Patch Changes

- [#65](https://github.com/nakita628/truth/pull/65) [`ccaeb57`](https://github.com/nakita628/truth/commit/ccaeb572d5d3b137e9bb2bc1aec0f20fcd20ca73) Thanks [@nakita628](https://github.com/nakita628)! - ArkType: write a union with a member that is not a string literal, such as a nullable enum, another way past 12 members, so a nullable enum of 12 to 16 values no longer fails to type-check with TS2589.

## 0.8.12

### Patch Changes

- [#61](https://github.com/nakita628/truth/pull/61) [`8e4d8c3`](https://github.com/nakita628/truth/commit/8e4d8c3e504febad405acf8ccb9a155d324f9914) Thanks [@nakita628](https://github.com/nakita628)! - Stop emitting `[].includes(key)`, which does not type-check, when an object's undeclared-key check has no property name to look up. When no property or pattern covers any key, every target now checks `Object.keys(…).length === 0` or holds each of `Object.values(…)` to the extra-key schema, so the Effect output for `{ "type": "object", "properties": {}, "additionalProperties": false }` type-checks.

## 0.8.11

### Patch Changes

- [#54](https://github.com/nakita628/truth/pull/54) [`3a25e86`](https://github.com/nakita628/truth/commit/3a25e86871e26d0638950a6563283affaedcf183) Thanks [@nakita628](https://github.com/nakita628)! - For `format: bigint`, `int64` and `uint64` in Zod, Valibot, ArkType and Effect, a fractional bound is rounded and a fractional `multipleOf` reduced to an integer, so the generated module no longer throws a `RangeError` (or fails to parse) on load. A zero `multipleOf` is left out, and a negative one is checked by its absolute value (in TypeBox too).

## 0.8.10

### Patch Changes

- [#50](https://github.com/nakita628/truth/pull/50) [`e2371e6`](https://github.com/nakita628/truth/commit/e2371e6d4ccf257ab02c0713bb76581418ad10e9) Thanks [@nakita628](https://github.com/nakita628)! - Emit numeric `exclusiveMinimum`, `exclusiveMaximum` and `multipleOf` on TypeBox's `Type.BigInt`, and write its bounds as integer numbers instead of `BigInt(<number>)`, which threw on a fractional bound when the generated module loaded. A fractional bound rounds to the integer that admits the same bigints (`minimum: 0.5` becomes `minimum:1`), and the schema stays serializable. A fractional `multipleOf` reduces to the integer divisor that admits the same bigints (`2.5` becomes `5`), and a non-finite bound or a divisor a number cannot hold exactly is left out.

## 0.8.9

### Patch Changes

- [#45](https://github.com/nakita628/truth/pull/45) [`d6ab264`](https://github.com/nakita628/truth/commit/d6ab2641fe905340c1eeaa3a6171a09939636a6d) Thanks [@nakita628](https://github.com/nakita628)! - TypeBox: honor a draft-04 boolean `exclusiveMinimum` / `exclusiveMaximum` outside a parameter. `{ minimum: 0, exclusiveMinimum: true }` now emits `Type.Integer({exclusiveMinimum:0})` instead of `Type.Integer({minimum:0})`, which accepted `0`. Its message is `x-exclusiveMinimum-message` / `x-exclusiveMaximum-message`, as in a parameter and in the other targets.

## 0.8.8

### Patch Changes

- [#41](https://github.com/nakita628/truth/pull/41) [`fdc1341`](https://github.com/nakita628/truth/commit/fdc13417a12ae49a8d7df7bc8334698119443caf) Thanks [@nakita628](https://github.com/nakita628)! - Return types are inferred instead of declared. `oas-truth` no longer exports the `Result` type: `parseOpenAPI` still resolves to `{ ok: true, value } | { ok: false, error }`, now inferred from its returns, so code that imported `Result` should use `Awaited<ReturnType<typeof parseOpenAPI>>` or its own alias. `isOpenAPIInput` and the `OpenAPIInput` type are removed too (the input type is `Parameters<typeof parseOpenAPI>[0]`): `parseOpenAPI` still rejects an unsupported string with `{ ok: false, error }`, so pass the value to it and read the result. The emitted code does not change.

## 0.8.7

### Patch Changes

- [#38](https://github.com/nakita628/truth/pull/38) [`b38c595`](https://github.com/nakita628/truth/commit/b38c595a22e6d6443f0d0a11873082b744479480) Thanks [@nakita628](https://github.com/nakita628)! - TypeBox: a number or integer read from text (query, path, header, cookie, form field) now carries its wire `pattern` as a string, so the schema serializes as valid JSON Schema, and checks its `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum` and `multipleOf` with `Type.Refine`.

## 0.8.6

### Patch Changes

- [#34](https://github.com/nakita628/truth/pull/34) [`64fba0e`](https://github.com/nakita628/truth/commit/64fba0e31ae49d00afaeaeb9c7fe93fcad0d28ba) Thanks [@nakita628](https://github.com/nakita628)! - Zod: read an `integer` / `number` parameter from wire text with `z.preprocess` instead of a `z.string().regex(...)` pipe, so a JSON Schema converter that documents the input side (hono-openapi's `validator`) describes it as the spec's `integer` / `number` with its bounds again, not as a `string` with a `pattern`. The strict text check is unchanged.
