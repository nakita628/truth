# oas-truth

Read OpenAPI / TypeSpec as the single source of truth and get a typed `OpenAPI` document back.

## Installation

```sh
npm install oas-truth
```

## Quick Start

```ts
import { parseOpenAPI } from 'oas-truth'

// a .yaml / .yml / .json / .tsp file, or an http(s) URL
const result = await parseOpenAPI('openapi.yaml')

if (result.ok) {
  result.value // resolved, typed OpenAPI document
} else {
  console.error(result.error)
}
```

`parseOpenAPI` does the following:

- OpenAPI documents (`.json` / `.yaml` / `.yml` files and `http://` / `https://` URLs) are bundled
  with `@apidevtools/swagger-parser` to resolve external `$ref`s
- TypeSpec files (`.tsp`) are compiled with `@typespec/compiler` and then bundled; the compiler is
  loaded only for a `.tsp` input
- Returns `{ ok: true, value } | { ok: false, error }` and never throws: an
  unsupported input, a missing file, an unreachable URL and a TypeSpec diagnostic all come back as
  `error`

The input is typed as a template literal union of these documents (`Parameters<typeof parseOpenAPI>[0]`). A string that names none of them is checked at runtime too and comes back as `{ ok: false, error }` before anything is read.

## Component schemas

`makeSchemasCode` emits one file: the library import and every `components.schemas` declaration, in
dependency order. `makeSchemaDeclarations` returns the same declarations one by one (`name`,
`varName`, `fileName`, `importLine`, `code`) so a host can split a file per schema.

Recursive `$ref` cycles keep a helper type so the const can be annotated (`z.ZodType<NodeType>`,
`v.GenericSchema<NodeType>`, `Schema.Codec<NodeType, unknown>`). The Effect annotation leaves the
encoded side free and the services `never`, so the declaration still decodes and passes to
`Schema.toStandardSchemaV1`. That helper matches what the library
infers — `| undefined` on Valibot optionals, `readonly` arrays on Effect — so it
type-checks under `exactOptionalPropertyTypes`. ArkType cycles become
`scope({...}).export().Member`; that declaration's `importLine` is then
`import { type, scope } from 'arktype'`. An Effect declaration's `importLine` names every
`effect` module its code uses (`Effect` for a decoding default, `SchemaTransformation` for an
int64 decode). A comment schema-truth puts above a declaration, such as TypeBox's marker for a
`not` it cannot enforce, is written above `export const`. `schemaImportLine` is the same
function `makeSchemasCode` uses when the declarations stay in one file.

Every other component kind has the same split: `make<Kind>Declarations` returns `{ name,
varName, fileName, code }` with no import line, and `make<Kind>Code` joins those bodies.
`makeMediaTypesCode` covers `components.mediaTypes`. `makeSchemaIdentifiers` is the collision
map (`user` / `User` → `User` / `User2`); `$ref`s resolve through it, so a later collider is
`User2Schema`.

`makeParametersCode` reads every parameter as text: `query`, `path`, `header` and `cookie`
values are coerced, and the parameter's `style`, `explode` and `allowEmptyValue` decide how the
text is split (`form` with `explode: false` reads `1,2,3`, `deepObject` gathers `filter[key]`).
`toExpression(schema, paramIn, { style, explode, allowEmptyValue })` takes the same options, and
`isParamStyle` narrows a free-form `style` to one it reads. TypeBox ignores the three options.

A Valibot `integer` / `number` parameter is a pipe that checks the text, then reads it with
`Number`. `@valibot/to-json-schema` documents the input side of a pipe only up to its
`v.transform`, so the pipe carries a `v.metadata({ type, minimum, ... })` that gives the document
the spec's type and bounds back, and a numeric `default` is annotated as the number over the
text `v.optional` holds; the text's `pattern` stays beside them. Only the scalar pipe is
annotated: an array or a nullable parameter starts with a transform of its own and is still
documented as `{}`. An exclusive bound is written as a number, the form of the converter's default
target (draft-07); a target that spells it another way, such as OpenAPI 3.0's boolean
`exclusiveMinimum`, is not followed. A 64-bit integer, read into a `bigint`, is not annotated.

`wrapSchema(expr, slot)` is slot-aware (`response-content`, `request-content`, `header`,
`parameter`, `media-type`). TypeBox imports from `typebox` and reserves `Compile`. Pass
`{ ref: true }` to `makeSchemaDeclarations` to register the OpenAPI key — TypeBox writes it
into the outermost builder options; the other libraries use an outer wrap.

```ts
import { makeAdapter, makeSchemaDeclarations, makeSchemaIdentifiers } from 'oas-truth'

const identifiers = makeSchemaIdentifiers(schemas)
const declarations = makeSchemaDeclarations(schemas, makeAdapter('arktype'))
// a cyclic file: import { type, scope } from 'arktype'
// a non-cyclic file: import { type } from 'arktype'
const source = `${declarations[0]?.importLine}\n\n${declarations[0]?.code}`
```

## Discriminator values

A `discriminator` member that no `mapping` entry names takes its own discriminator property's `const` / `enum` values before its schema name, as in schema-truth. This departs from the specification's implicit mapping on purpose, so that documents such as OpenAI's `CompoundFilter` validate as intended.

## License

[MIT](https://github.com/nakita628/truth/blob/main/LICENSE)
