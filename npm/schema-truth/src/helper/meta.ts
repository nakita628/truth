import { INTEGER_TEXT_PATTERN, NUMBER_RANGES } from '../constants/index.js'
import type { JSONSchema } from '../parser/index.js'
import { coerceDefault, definitionOf, makeSafeKey, normalizeTypes } from '../utils/index.js'
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
  const emitted = typeboxEmitted(schema, definitions)
  const result = coerceDefault(emitted, schema.default, definitions)
  if (!result.keep) return []
  const value = stringWire ? wireDefaultText(schema, result.value) : result.value
  if (value === undefined) return []
  // A `Type.BigInt` (on the node, or beside a `$ref` or `allOf` to one) carries no default.
  // A number default is one `Value.Default` puts in and `Type.BigInt` then rejects, and a
  // bigint default is not JSON, so the schema would no longer go through `JSON.stringify`
  // (OpenAPI emission, Fastify route schemas, Ajv). Leaving it out keeps both right.
  if (
    typeof value === 'number' &&
    bigintFormatOf(emitted, definitions, isTypeboxBigint) === 'bigint'
  ) {
    return []
  }
  const formatLiteral =
    typeof value === 'boolean' || typeof value === 'number' ? `${value}` : JSON.stringify(value)
  return [`default:${formatLiteral}`]
}

/** The types in the order `typebox()` reads them: the first one it finds is emitted. */
const TYPEBOX_TYPE_ORDER = [
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'object',
  'date',
] as const

/**
 * The schema as the TypeBox node it is emitted as, for reading its default. A node of
 * several types is the first one `typebox()` reads (`['integer', 'string']` is a
 * `Type.String`, which takes `"5"`, not `5`), and a node with `properties` is an object.
 * A union is read from the keyword `typebox()` emits (`oneOf` before `anyOf`; an empty one
 * is a `Type.Any`, nullable as the node is), each member as it is emitted, leaving out a
 * member emitted as a `Type.BigInt`, which no number default fits, so the default is read
 * by a member that takes it. A union of nothing but such members is left as it is, for
 * the `Type.BigInt` check to leave its default out. A `$ref`, which `typebox()` reads
 * first, is read as its target, nullable as the node is; a reference already being read
 * ends there, as a cycle does.
 */
function typeboxEmitted(
  schema: JSONSchema,
  definitions?: SchemaDefinitions,
  reading: ReadonlySet<string> = new Set(),
): JSONSchema {
  const emitted = (node: JSONSchema) => typeboxEmitted(node, definitions, reading)
  const types = normalizeTypes(schema.type)
  if (schema.$ref !== undefined) {
    const { $ref, nullable } = schema
    const target = reading.has($ref) ? undefined : definitionOf($ref, definitions)
    if (target === undefined) return schema
    // The node is the target's; of the keywords beside it, `typebox()` emits only the wrap.
    return typeboxEmitted(
      nullable === undefined ? target : { ...target, nullable },
      definitions,
      new Set([...reading, $ref]),
    )
  }
  const key =
    schema.oneOf !== undefined ? 'oneOf' : schema.anyOf !== undefined ? 'anyOf' : undefined
  if (key !== undefined) {
    const { oneOf: _oneOf, anyOf: _anyOf, ...rest } = schema
    const members = (schema[key] ?? []).map(emitted)
    if (members.length === 0) {
      return schema.nullable === true || types.includes('null') ? { nullable: true } : {}
    }
    const takers = members.filter(
      (member) => bigintFormatOf(member, definitions, isTypeboxBigint) !== 'bigint',
    )
    return { ...rest, [key]: takers.length === 0 ? members : takers }
  }
  if (schema.allOf !== undefined) return { ...schema, allOf: schema.allOf.map(emitted) }
  if (schema.enum !== undefined || schema.const !== undefined) return schema
  if (schema.properties !== undefined) {
    return { ...schema, type: types.includes('null') ? ['object', 'null'] : 'object' }
  }
  const first = TYPEBOX_TYPE_ORDER.find((type) => types.includes(type))
  if (first === undefined || types.filter((type) => type !== 'null').length < 2) return schema
  return { ...schema, type: types.includes('null') ? [first, 'null'] : first }
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
 * Whether TypeBox emits the node as a `Type.BigInt`: an integer of `format: bigint` whose
 * `type` names no `string` or `number`, which `typebox()` reads first. An int64 or uint64
 * integer is a `Type.Integer`, which takes a number default, so a union with such a member
 * keeps its default.
 */
function isTypeboxBigint(node: DefaultSchema) {
  if (node.format !== 'bigint' || !isBigintSchema(node)) return false
  // `typebox()` reads `string` and `number` before `integer`.
  const types = normalizeTypes(node.type)
  return !types.includes('string') && !types.includes('number')
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
 * - A `__proto__` key is written as a computed key, so it stays an own property
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
  // A plain `__proto__:` (quoted or not) sets the literal's prototype; only a computed key
  // makes it an own property.
  const parts = entries.map(
    ([k, v]) => `${k === '__proto__' ? '["__proto__"]' : makeSafeKey(k)}:${serializeJSValue(v)}`,
  )
  return `{${parts.join(',')}}`
}
