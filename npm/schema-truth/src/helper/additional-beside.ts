import { ALL_CODE_EXTENSION_KEYS } from '../constants/index.js'
import { isDefaultOnlyMember, isJSONValue } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { coerceDefault } from '../utils/index.js'
import type { SchemaDefinitions } from './schema.js'
import { withoutShadowedUnevaluated } from './unevaluated.js'

/**
 * The keywords that wrap the whole node (its default, fallbacks, brand, code extensions and
 * metadata), which stay on the node rather than on the member that keeps its combinator.
 */
const NODE_WRAPPER_KEYS: ReadonlySet<string> = new Set([
  'default',
  'title',
  'description',
  'examples',
  'example',
  'deprecated',
  'externalDocs',
  'readOnly',
  'writeOnly',
  'x-catch',
  'x-prefault',
  'x-fallback',
  'x-brand',
  'x-readonly',
  'x-superRefine',
  ...ALL_CODE_EXTENSION_KEYS,
])

/** The names, each with no constraint of its own. */
function unconstrained(names: readonly string[]) {
  return Object.fromEntries(names.map((name) => [name, {}]))
}

/** Whether `additionalProperties` refuses nothing: `true` or an empty schema. */
function isUnrestrictive(additionalProperties: JSONSchema['additionalProperties']) {
  return (
    additionalProperties === true ||
    (typeof additionalProperties === 'object' && Object.keys(additionalProperties).length === 0)
  )
}

/**
 * A node with `allOf` / `anyOf` / `oneOf` and an `additionalProperties` that refuses
 * something beside it, as an `allOf` of the node without that keyword and a member that
 * holds it as `unevaluatedProperties`, as JSON Schema reads it (#138). The member names the
 * node's own `properties` and `patternProperties` with no constraint of their own, so only
 * the keys those leave are held to `additionalProperties`; whether the named keys meet
 * their own schemas is up to the node. A value that is not an object passes the member, as
 * `additionalProperties` reads objects only. An `unevaluatedProperties` that
 * `additionalProperties` shadows is left out, and the node's default, fallbacks, brand,
 * code extensions and metadata wrap the whole `allOf`. Its default (its own, or an `allOf`
 * member that only carries one) is read against the node as written, before the split
 * hides `additionalProperties` from it, and the wrapper keeps the node's `type` and
 * `nullable` so the default it reads again stays as read. `undefined` when the node has no
 * such pair.
 */
export function additionalBesideCombinator(
  schema: JSONSchema,
  definitions?: SchemaDefinitions,
): JSONSchema | undefined {
  const { additionalProperties } = schema
  if (additionalProperties === undefined || isUnrestrictive(additionalProperties)) return undefined
  if (schema.allOf === undefined && schema.anyOf === undefined && schema.oneOf === undefined) {
    return undefined
  }
  const {
    additionalProperties: _additional,
    unevaluatedProperties: _unevaluated,
    'x-unevaluatedProperties-message': _unevaluatedMessage,
    'x-additionalProperties-message': additionalMessage,
    ...unwrapped
  } = withoutShadowedUnevaluated(schema)
  const written = schema.allOf?.find(isDefaultOnlyMember)?.default ?? schema.default
  const read = written === undefined ? undefined : coerceDefault(schema, written, definitions)
  const allOf = unwrapped.allOf?.filter((member) => !isDefaultOnlyMember(member))
  const rest: JSONSchema = {
    ...Object.fromEntries(
      Object.entries(unwrapped).filter(([key]) => key !== 'allOf' && !NODE_WRAPPER_KEYS.has(key)),
    ),
    ...(allOf !== undefined && allOf.length > 0 && { allOf }),
  }
  const wrappers = Object.fromEntries(
    Object.entries(unwrapped).filter(([key]) => key !== 'default' && NODE_WRAPPER_KEYS.has(key)),
  )
  // An `unevaluatedProperties` beside an `allOf` of one bare object evaluates exactly the
  // keys named here; the generators check it on the input before an object strips a key.
  const closed: JSONSchema = {
    allOf: [{ type: 'object' }],
    ...(schema.properties !== undefined && {
      properties: unconstrained(Object.keys(schema.properties)),
    }),
    ...(schema.patternProperties !== undefined && {
      patternProperties: unconstrained(Object.keys(schema.patternProperties)),
    }),
    unevaluatedProperties: additionalProperties,
    ...(additionalMessage !== undefined && {
      'x-unevaluatedProperties-message': additionalMessage,
    }),
  }
  return {
    ...wrappers,
    ...(read?.keep === true && isJSONValue(read.value) && { default: read.value }),
    ...(schema.type !== undefined && { type: schema.type }),
    ...(schema.nullable !== undefined && { nullable: schema.nullable }),
    allOf: [rest, { anyOf: [{ not: { type: 'object' } }, closed] }],
  }
}
