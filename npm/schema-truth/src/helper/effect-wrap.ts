import { isNullable } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { coerceDefault } from '../utils/index.js'
import { readCodeExtension } from './code-extensions.js'
import type { CodeExtensionOptions } from './code-extensions.js'
import { serializeJSValue } from './meta.js'
import { examplesOf } from './schema.js'
import type { SchemaDefinitions } from './schema.js'
import { jsLiteral } from './value.js'
import { isNullMatchedFirst, wireNullText } from './wire.js'

/** The options of {@link effectWrap} beyond the code extensions. */
export type EffectWrapOptions = CodeExtensionOptions & {
  /**
   * The schema reads a string-wire parameter: its encoded side is text, so a default is
   * applied to the decoded side with `Schema.withDecodingDefaultType`.
   */
  readonly stringWire?: boolean
  /**
   * The text `null` is read as `null` ahead of the schema, which takes `null` but no
   * string. A union's members would decode the text to `0` or `false` first, so such a
   * schema is also made `NullOr` unless a `null` literal of its own matches first.
   */
  readonly nullText?: boolean
  /** Definitions a `default` beside a `$ref` is reconciled against. */
  readonly definitions?: SchemaDefinitions
}

/** `inner` read after `reader`, a `(input) => ...` arrow over the raw value. */
export function effectPreprocess(readers: readonly string[], inner: string): string {
  if (readers.length === 0) return inner
  const steps = readers.map(
    (reader) =>
      `Schema.decodeTo(Schema.Unknown,SchemaTransformation.transform<unknown,unknown>({decode:${reader},encode:(output)=>output}))`,
  )
  return `Schema.Unknown.pipe(${steps.join(',')},Schema.decodeTo(${inner}))`
}

/** A default as the Effect literal of the schema's decoded type: a bigint for a 64-bit integer. */
function defaultLiteral(schema: JSONSchema, value: unknown): string {
  if (typeof value === 'number') {
    if (schema.format === 'int64' || schema.format === 'uint64') return `${value}n`
    if (schema.format === 'bigint') return `BigInt(${value})`
  }
  return jsLiteral(value)
}

/**
 * Wraps an Effect Schema v4 schema string with `Schema.withDecodingDefault()`,
 * `Schema.NullOr()`, `Schema.brand()` and `.annotate({...})` based on
 * `default` / `nullable` / `x-brand` and OpenAPI metadata fields.
 *
 * Metadata mapping (v4 `.annotate`):
 * - `description` → `description`
 * - `readOnly` / `writeOnly` → same-named annotations (v4 promoted both to
 *   first-class fields on `Annotations.Augment`)
 * - `examples` (or `[example]` when only singular present), `deprecated` and
 *   `externalDocs` → carried as loose annotation keys, since v4 types the
 *   native `examples` annotation as `ReadonlyArray<T>` and OpenAPI specs may
 *   carry incomplete examples that would fail to type-check.
 *
 * @see https://effect.website/docs/schema/annotations/
 */
export function effectWrap(
  effectStr: string,
  schema: JSONSchema,
  options?: EffectWrapOptions,
): string {
  const nullText = options?.nullText === true
  const nullable = isNullable(schema) || (nullText && !isNullMatchedFirst(schema))
  // `Schema.NullOr` wraps a schema, so it goes inside the decoding default:
  // `withDecodingDefault` composes onto whatever schema it is piped from.
  const withNullable = nullable ? `Schema.NullOr(${effectStr})` : effectStr
  const withNullText = nullText
    ? effectPreprocess([wireNullText('input')], withNullable)
    : withNullable
  const brand = schema['x-brand']
  const withBrand =
    typeof brand === 'string' ? `${withNullText}.pipe(Schema.brand("${brand}"))` : withNullText
  const filter = readCodeExtension(schema, 'x-filter', options)
  const transformExt = readCodeExtension(schema, 'x-transform', options)
  const pipeExt = readCodeExtension(schema, 'x-pipe', options)
  const codeChain = [filter, transformExt, pipeExt].filter((v): v is string => v !== undefined)
  const withCodeExts = codeChain.length === 0 ? withBrand : `${withBrand}${codeChain.join('')}`
  // v4 replaced `Schema.optionalWith(s, {default})` with a pipeable
  // `Schema.withDecodingDefault(Effect.succeed(value))`, which already makes
  // the encoded key optional. The default is an `Encoded` value, which is what
  // `coerceDefault` produces — except on the string wire, where the encoded side
  // is text and the default is the decoded value instead.
  const defaultResult =
    schema.default !== undefined
      ? coerceDefault(schema, schema.default, options?.definitions)
      : undefined
  const decodingDefault =
    options?.stringWire === true ? 'Schema.withDecodingDefaultType' : 'Schema.withDecodingDefault'
  const withDefault = defaultResult?.keep
    ? `${withCodeExts}.pipe(${decodingDefault}(Effect.succeed(${defaultLiteral(schema, defaultResult.value)})))`
    : withCodeExts

  const examples = examplesOf(schema)
  const ann: Record<string, unknown> = {}
  if (schema.description !== undefined) ann.description = schema.description
  // v4 types `examples` as `ReadonlyArray<T>`. OpenAPI examples are
  // documentation metadata, not constraints, and specs may carry incomplete
  // examples; keeping them under a loose key avoids failing generation on
  // otherwise valid input. `Annotations` has a string index signature, so
  // unknown keys are accepted.
  if (examples !== undefined) ann.jsonSchemaExamples = examples
  if (schema.deprecated !== undefined) ann.jsonSchemaDeprecated = schema.deprecated
  if (schema.externalDocs !== undefined) ann.jsonSchemaExternalDocs = schema.externalDocs
  if (schema.readOnly !== undefined) ann.readOnly = schema.readOnly
  if (schema.writeOnly !== undefined) ann.writeOnly = schema.writeOnly
  if (Object.keys(ann).length === 0) return withDefault
  return `${withDefault}.annotate(${serializeJSValue(ann)})`
}
