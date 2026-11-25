import { INTEGER_TEXT_PATTERN, NUMBER_RANGES } from '../constants/index.js'
import type { JSONSchema } from '../parser/index.js'
import { coerceDefault, makeSafeKey } from '../utils/index.js'
import type { DefaultSchema } from '../utils/index.js'
import { bigintFormatOf, bigintWireText, isBigintSchema, isBigintWire } from './bigint.js'
import { examplesOf } from './schema.js'
import type { SchemaDefinitions } from './schema.js'

/**
 * Host `$ref` name for OpenAPI component registration (hono-openapi
 * `components.schemas`). TypeBox stores this on the schema at construction
 * time — there is no post-construction `.meta()` — so it must land in the
 * factory options object. Empty when the caller omitted `ref`.
 */
export function typeboxRefOpt(ref?: string) {
  return ref === undefined ? [] : [`ref:${JSON.stringify(ref)}`]
}

/**
 * Returns OpenAPI/JSON Schema metadata fields as a list of TypeBox option
 * entries (`'key:value'` strings) ready to be joined into a `{...}` literal.
 *
 * Used by TypeBox type-level generators to embed metadata directly into the
 * `Type.X(payload, options)` constructor call. A host `ref` is emitted first
 * when supplied, in the same object as description / examples / deprecated.
 */
export function typeboxMetaOpts(schema: JSONSchema, ref?: string) {
  const examples = examplesOf(schema)
  return [
    ...typeboxRefOpt(ref),
    schema.description !== undefined
      ? `description:${JSON.stringify(schema.description)}`
      : undefined,
    examples !== undefined ? `examples:${serializeJSValue(examples)}` : undefined,
    schema.deprecated !== undefined ? `deprecated:${schema.deprecated}` : undefined,
    schema.externalDocs !== undefined
      ? `externalDocs:${serializeJSValue(schema.externalDocs)}`
      : undefined,
    schema.readOnly !== undefined ? `readOnly:${schema.readOnly}` : undefined,
    schema.writeOnly !== undefined ? `writeOnly:${schema.writeOnly}` : undefined,
  ].filter((v) => v !== undefined)
}

/**
 * Returns the TypeBox `default` option entry (`['default:1']`) for a schema, or
 * `[]` when absent/droppable. TypeBox v1's `Type.Optional(type)` takes one arg —
 * defaults must live on the inner type's options object, so every factory emits
 * its own default here rather than the wrapper passing a 2nd `Type.Optional` arg.
 * `stringWire` (for `query`/`path` coercion) emits the default in its string-wire
 * form (`'1'` / `'true'`), since the coerced `Type.String(...)` input is a string.
 */
export function typeboxDefaultOpt(
  schema: JSONSchema,
  stringWire = false,
  definitions?: SchemaDefinitions,
) {
  if (schema.default === undefined) return []
  const result = coerceDefault(schema, schema.default, definitions)
  if (!result.keep) return []
  const value = stringWire ? wireDefaultText(schema, result.value) : result.value
  if (value === undefined) return []
  // A `Type.BigInt` (on the node, or beside a `$ref` or `allOf` to one) carries no default.
  // A number default is one `Value.Default` puts in and `Type.BigInt` then rejects, and a
  // bigint default is not JSON, so the schema would no longer go through `JSON.stringify`
  // (OpenAPI emission, Fastify route schemas, Ajv). Leaving it out keeps both right.
  if (
    typeof value === 'number' &&
    bigintFormatOf(schema, definitions, isTypeboxBigint) === 'bigint'
  ) {
    return []
  }
  const formatLiteral =
    typeof value === 'boolean' || typeof value === 'number' ? `${value}` : JSON.stringify(value)
  return [`default:${formatLiteral}`]
}

/**
 * A default as the text a string wire reads. A {@link isBigintWire} node is decoded with
 * `BigInt`, so its default is spelled in digits, a digit-text default as written (a
 * number would round it), and one outside the `int64` / `uint64` range, such as a `uint64`
 * maximum a number rounds up, has no text the wire takes: `undefined`.
 */
function wireDefaultText(schema: JSONSchema, value: unknown) {
  if (!isBigintWire(schema)) return String(value)
  const raw = schema.default
  const text =
    typeof raw === 'string' && INTEGER_TEXT_PATTERN.test(raw) ? raw : bigintWireText(value)
  if (!INTEGER_TEXT_PATTERN.test(text)) return text
  const range = schema.format === undefined ? undefined : NUMBER_RANGES[schema.format]
  const digits = BigInt(text)
  if (
    range !== undefined &&
    (digits < BigInt(range.minimum.slice(0, -1)) || digits > BigInt(range.maximum.slice(0, -1)))
  ) {
    return undefined
  }
  return text
}

/**
 * Whether TypeBox emits the node as a `Type.BigInt`: an integer of `format: bigint`. An
 * int64 or uint64 integer is a `Type.Integer`, which takes a number default, so a union
 * with such a member keeps its default.
 */
function isTypeboxBigint(node: DefaultSchema) {
  return node.format === 'bigint' && isBigintSchema(node)
}

/**
 * Whether the TypeBox output carries the node's `default` (see {@link typeboxDefaultOpt}):
 * a kept default, except a number one on a `Type.BigInt`, which is left out. The node is
 * `Type.Optional` exactly when this holds, so a required key whose default is left out
 * stays required.
 */
export function hasTypeboxDefault(
  schema: JSONSchema,
  stringWire = false,
  definitions?: SchemaDefinitions,
) {
  return typeboxDefaultOpt(schema, stringWire, definitions).length > 0
}

/**
 * Serializes a value into a JavaScript expression string.
 *
 * - Strings, numbers, booleans, null: via `JSON.stringify`
 * - Arrays: `[elem1,elem2,...]`
 * - Plain objects: `{key1:value1,...}` with bare identifiers when possible
 * - Undefined values inside objects are skipped
 */
export function serializeJSValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map(serializeJSValue).join(',')}]`
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return '{}'
  const parts = entries.map(([k, v]) => `${makeSafeKey(k)}:${serializeJSValue(v)}`)
  return `{${parts.join(',')}}`
}
