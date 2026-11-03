import { isNullable } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { coerceDefault } from '../utils/index.js'
import { readCodeExtension } from './code-extensions.js'
import type { CodeExtensionOptions } from './code-extensions.js'
import { serializeJSValue } from './meta.js'
import { examplesOf } from './schema.js'
import type { SchemaDefinitions } from './schema.js'
import { jsLiteral } from './value.js'
import { isNullMatchedFirst, wireDefaultValue, wireNullText } from './wire.js'

/** The options of {@link valibotWrap} beyond the code extensions. */
export type ValibotWrapOptions = CodeExtensionOptions & {
  /**
   * The schema reads a string-wire parameter: its input is text, so a default is spelled
   * in its text form (`'1'`, `'true'`), which the pipe coerces back.
   */
  readonly stringWire?: boolean
  /**
   * The text `null` is read as `null` ahead of the schema, which takes `null` but no
   * string. A combinator's members would coerce the text to `0` or `false` first, so
   * such a schema is also made nullable unless a `null` literal of its own matches first.
   */
  readonly nullText?: boolean
  /** Definitions a `default` beside a `$ref` is reconciled against. */
  readonly definitions?: SchemaDefinitions
}

/** A default as the Valibot literal of the schema's input: a bigint for a 64-bit integer. */
function defaultLiteral(schema: JSONSchema, value: unknown, stringWire: boolean): string {
  if (stringWire) return jsLiteral(wireDefaultValue(value))
  if (typeof value === 'number') {
    if (schema.format === 'int64' || schema.format === 'uint64') return `${value}n`
    if (schema.format === 'bigint') return `BigInt(${value})`
  }
  return jsLiteral(value)
}

/**
 * Wraps a Valibot schema string with `v.nullable()`, `v.optional(..., default)`,
 * metadata actions (`v.description()` / `v.metadata()`) and `v.brand()` based on the
 * JSON Schema's `default` / `nullable` / `x-brand` and OpenAPI metadata fields. All
 * actions are consolidated into a single outer `v.pipe(...)`.
 *
 * `v.optional(schema, default)` is the outermost of the three so that an object never
 * has to wrap the property again: the key is optional and its default applies whatever
 * the schema inside.
 *
 * Metadata mapping (Valibot v1 actions):
 * - `description` → `v.description(text)`
 * - `examples` (or `[example]`), `deprecated`, `externalDocs`, `readOnly`,
 *   `writeOnly` → `v.metadata({ ... })`
 *
 * @see https://valibot.dev/api/metadata/
 * @see https://valibot.dev/api/description/
 */
export function valibotWrap(
  valibotStr: string,
  schema: JSONSchema,
  options?: ValibotWrapOptions,
): string {
  const nullText = options?.nullText === true
  const nullable = isNullable(schema) || (nullText && !isNullMatchedFirst(schema))
  const withNullable = nullable ? `v.nullable(${valibotStr})` : valibotStr
  const withNullText = nullText
    ? `v.pipe(v.unknown(),v.transform(${wireNullText('input')}),${withNullable})`
    : withNullable
  const defaultResult =
    schema.default !== undefined
      ? coerceDefault(schema, schema.default, options?.definitions)
      : undefined
  const withDefault = defaultResult?.keep
    ? `v.optional(${withNullText},${defaultLiteral(schema, defaultResult.value, options?.stringWire === true)})`
    : withNullText

  const examples = examplesOf(schema)
  const actions: string[] = []
  if (schema.description !== undefined) {
    actions.push(`v.description(${JSON.stringify(schema.description)})`)
  }
  const metaObj: Record<string, unknown> = {}
  if (examples !== undefined) metaObj.examples = examples
  if (schema.deprecated !== undefined) metaObj.deprecated = schema.deprecated
  if (schema.externalDocs !== undefined) metaObj.externalDocs = schema.externalDocs
  if (schema.readOnly !== undefined) metaObj.readOnly = schema.readOnly
  if (schema.writeOnly !== undefined) metaObj.writeOnly = schema.writeOnly
  if (Object.keys(metaObj).length > 0) {
    actions.push(`v.metadata(${serializeJSValue(metaObj)})`)
  }

  if (schema['x-readonly'] === true) {
    actions.push('v.readonly()')
  }

  const brand = schema['x-brand']
  if (typeof brand === 'string') {
    actions.push(`v.brand("${brand}")`)
  }

  const check = readCodeExtension(schema, 'x-check', options)
  if (check) actions.push(check)
  const transform = readCodeExtension(schema, 'x-transform', options)
  if (transform) actions.push(transform)
  const pipeExt = readCodeExtension(schema, 'x-pipe', options)
  if (pipeExt) actions.push(pipeExt)

  const piped = actions.length === 0 ? withDefault : `v.pipe(${withDefault},${actions.join(',')})`
  if (schema['x-fallback'] !== undefined) {
    return `v.fallback(${piped},${jsLiteral(schema['x-fallback'])})`
  }
  return piped
}
