import type { JSONSchema } from '../parser/index.js'
import { coerceDefault, makeSafeKey } from '../utils/index.js'
import { examplesOf } from './schema.js'
import type { SchemaDefinitions } from './schema.js'

/**
 * Host `$ref` name for OpenAPI component registration (hono-openapi
 * `components.schemas`). TypeBox stores this on the schema at construction
 * time — there is no post-construction `.meta()` — so it must land in the
 * factory options object. Empty when the caller omitted `ref`.
 */
export function typeboxRefOpt(ref?: string): readonly string[] {
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
export function typeboxMetaOpts(schema: JSONSchema, ref?: string): readonly string[] {
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
): readonly string[] {
  if (schema.default === undefined) return []
  const result = coerceDefault(schema, schema.default, definitions)
  if (!result.keep) return []
  const value = stringWire ? String(result.value) : result.value
  const formatLiteral =
    typeof value === 'boolean' || typeof value === 'number' ? `${value}` : JSON.stringify(value)
  return [`default:${formatLiteral}`]
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
