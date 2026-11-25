import { isNullable } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { coerceDefault } from '../utils/index.js'
import {
  bigintFormatOf,
  bigintValueLiteral,
  isBigintSchema,
  isWritableBigintDefault,
} from './bigint.js'
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
   * The expression is the `null` schema itself (a `type: 'null'` node): nullability adds
   * nothing to it, so it is not wrapped a second time.
   */
  readonly nullSchema?: boolean
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
  /**
   * The expression reads wire text through a `v.transform`, where a JSON Schema converter
   * of the input side (`@valibot/to-json-schema` with `typeMode: 'input'`) stops: the
   * spec's own schema is put ahead of it as `v.metadata(...)`, so the document is complete.
   */
  readonly wireDocument?: boolean
  /** Definitions a `default` beside a `$ref` is reconciled against. */
  readonly definitions?: SchemaDefinitions
}

/** OpenAPI keywords a JSON Schema document has no use for. */
const NON_JSON_SCHEMA_KEYS = new Set(['discriminator', 'xml', 'externalDocs', 'example'])

/** The keywords whose value is a schema or a list of schemas. */
const SCHEMA_VALUED_KEYS = new Set([
  'items',
  'additionalItems',
  'contentSchema',
  'prefixItems',
  'additionalProperties',
  'unevaluatedProperties',
  'unevaluatedItems',
  'propertyNames',
  'contains',
  'not',
  'if',
  'then',
  'else',
  'allOf',
  'anyOf',
  'oneOf',
])

/** The keywords whose value maps names to schemas. */
const SCHEMA_MAP_KEYS = new Set([
  'properties',
  'dependencies',
  'patternProperties',
  'dependentSchemas',
  '$defs',
  'definitions',
])

/**
 * The `v.string(...)` a pipe starts with, if it does. The document goes after it, so the
 * pipe still expects a string (a union's message names what its members expect); the
 * original pipe follows as a nested schema, where the converter stops before its regex.
 */
function leadingStringSchema(expression: string) {
  const head = 'v.pipe(v.string('
  if (!expression.startsWith(head)) return undefined
  let depth = 1
  let quote: string | undefined = undefined
  let isEscaped = false
  for (let index = head.length; index < expression.length; index += 1) {
    const char = expression[index]
    if (quote !== undefined) {
      if (isEscaped) isEscaped = false
      else if (char === '\\') isEscaped = true
      else if (char === quote) quote = undefined
    } else if (char === '"' || char === "'" || char === '`') quote = char
    else if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) return expression.slice('v.pipe('.length, index + 1)
    }
  }
  return undefined
}

/** An object's entries; none for anything else. */
function entriesOf(value: unknown): [string, unknown][] {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.entries(value)
    : []
}

/**
 * The spec's own schema of a wire node as a JSON Schema document: `x-` extensions and the
 * OpenAPI-only keywords left out, OpenAPI 3.0's `nullable` written as a `null` type and
 * `example` as `examples`. The root's `default` is left to `v.optional`, and a property
 * with a default is not `required`. `undefined` when a `$ref`
 * sits anywhere inside, since the document would point at a definition it does not hold.
 */
export function wireDocument(schema: JSONSchema): { readonly [key: string]: unknown } | undefined {
  const state = { hasRef: false }
  const visit = (value: unknown, isSchema: boolean, isRoot = false): unknown => {
    if (Array.isArray(value)) return value.map((item: unknown) => visit(item, isSchema))
    if (typeof value !== 'object' || value === null) return value
    const entries = entriesOf(value)
    if (!isSchema) {
      return Object.fromEntries(entries.map(([key, item]) => [key, visit(item, false)]))
    }
    const record = new Map(entries)
    if (record.has('$ref')) state.hasRef = true
    const out = new Map<string, unknown>()
    for (const [key, item] of entries) {
      if (key.startsWith('x-') || key === 'nullable' || NON_JSON_SCHEMA_KEYS.has(key)) continue
      // The root's `default` is documented by `v.optional`; below it the converter never
      // reaches the inner pipes, so the document carries it.
      if (key === 'default' && isRoot) continue
      out.set(
        key,
        SCHEMA_MAP_KEYS.has(key)
          ? Object.fromEntries(entriesOf(item).map(([name, sub]) => [name, visit(sub, true)]))
          : visit(item, SCHEMA_VALUED_KEYS.has(key)),
      )
    }
    if (!record.has('examples') && record.has('example')) {
      out.set('examples', [record.get('example')])
    }
    // A property with a default may be left out, as `v.optional` lets it.
    const required: unknown = out.get('required')
    if (Array.isArray(required)) {
      const properties = new Map(entriesOf(record.get('properties')))
      const kept = required.filter(
        (name: unknown) =>
          typeof name !== 'string' || !new Map(entriesOf(properties.get(name))).has('default'),
      )
      if (kept.length > 0) out.set('required', kept)
      else out.delete('required')
    }
    const type: unknown = out.get('type')
    const enumValues: unknown = out.get('enum')
    if (record.get('nullable') === true) {
      if (type !== undefined) {
        const types: unknown[] = Array.isArray(type) ? type : [type]
        if (!types.includes('null')) out.set('type', [...types, 'null'])
      }
      if (Array.isArray(enumValues) && !enumValues.includes(null)) {
        const values: unknown[] = enumValues
        out.set('enum', [...values, null])
      }
      if (out.has('const') && out.get('const') !== null) {
        out.set('enum', [out.get('const'), null])
        out.delete('const')
      }
    }
    // Without a `type`, a combinator still rejects `null`, so the null type is added beside it.
    const isNullableCombinator =
      record.get('nullable') === true &&
      type === undefined &&
      ['oneOf', 'anyOf', 'allOf'].some((key) => out.has(key))
    // OpenAPI 3.0's boolean exclusive bounds, in the numeric form of draft-07 and 2020-12.
    for (const [exclusive, bound] of [
      ['exclusiveMinimum', 'minimum'],
      ['exclusiveMaximum', 'maximum'],
    ] as const) {
      const flag = out.get(exclusive)
      if (typeof flag !== 'boolean') continue
      out.delete(exclusive)
      const boundValue = out.get(bound)
      if (flag && typeof boundValue === 'number') {
        out.delete(bound)
        out.set(exclusive, boundValue)
      }
    }
    return isNullableCombinator
      ? { anyOf: [Object.fromEntries(out), { type: 'null' }] }
      : Object.fromEntries(out)
  }
  const document = entriesOf(visit(schema, true, true))
  return state.hasRef ? undefined : Object.fromEntries(document)
}

/** A default as the Valibot literal of the schema's input: a bigint for a 64-bit integer. */
function defaultLiteral(format: string | undefined, value: unknown, stringWire: boolean) {
  if (stringWire) return jsLiteral(wireDefaultValue(value))
  if (typeof value === 'number') {
    if (format === 'int64' || format === 'uint64') return bigintValueLiteral(value)
    if (format === 'bigint') return `BigInt(${value})`
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
export function valibotWrap(valibotStr: string, schema: JSONSchema, options?: ValibotWrapOptions) {
  const nullText = options?.nullText === true
  const nullable =
    (isNullable(schema) && options?.nullSchema !== true) ||
    (nullText && !isNullMatchedFirst(schema))
  const withNullable = nullable ? `v.nullable(${valibotStr})` : valibotStr
  const withNullTextRead = nullText
    ? `v.pipe(v.unknown(),v.transform(${wireNullText('input')}),${withNullable})`
    : withNullable
  const document = options?.wireDocument === true || nullText ? wireDocument(schema) : undefined
  const leadingString = leadingStringSchema(withNullTextRead)
  const withNullText =
    document === undefined
      ? withNullTextRead
      : leadingString !== undefined
        ? `v.pipe(${leadingString},v.metadata(${serializeJSValue(document)}),${withNullTextRead})`
        : withNullTextRead.startsWith('v.pipe(v.unknown(),')
          ? `v.pipe(v.unknown(),v.metadata(${serializeJSValue(document)}),${withNullTextRead.slice('v.pipe(v.unknown(),'.length)}`
          : `v.pipe(v.unknown(),v.metadata(${serializeJSValue(document)}),${withNullTextRead})`
  const defaultResult =
    schema.default !== undefined
      ? coerceDefault(schema, schema.default, options?.definitions)
      : undefined
  // A `default` beside a `$ref` is the bigint its target holds; a fraction there is dropped.
  const defaultFormat =
    typeof defaultResult?.value === 'number'
      ? bigintFormatOf(schema, options?.definitions, isBigintSchema)
      : undefined
  const hasDefault =
    defaultResult?.keep === true && isWritableBigintDefault(defaultResult.value, defaultFormat)
  const withDefault = hasDefault
    ? `v.optional(${withNullText},${defaultLiteral(defaultFormat, defaultResult.value, options?.stringWire === true)})`
    : withNullText

  const examples = examplesOf(schema)
  const actions: string[] = []
  if (schema.description !== undefined) {
    actions.push(`v.description(${JSON.stringify(schema.description)})`)
  }
  const metaObj: { [key: string]: unknown } = {}
  if (examples !== undefined) metaObj.examples = examples
  if (schema.deprecated !== undefined) metaObj.deprecated = schema.deprecated
  if (schema.externalDocs !== undefined) metaObj.externalDocs = schema.externalDocs
  if (schema.readOnly !== undefined) metaObj.readOnly = schema.readOnly
  if (schema.writeOnly !== undefined) metaObj.writeOnly = schema.writeOnly
  // A wire number or boolean is documented as the value it is read into, so its default is
  // documented as that value too, over the text `v.optional` holds.
  if (
    hasDefault &&
    options?.stringWire === true &&
    (typeof defaultResult.value === 'number' || typeof defaultResult.value === 'boolean') &&
    defaultFormat === undefined
  ) {
    metaObj.default = defaultResult.value
  }
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
