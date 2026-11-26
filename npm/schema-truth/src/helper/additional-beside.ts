import type { JSONSchema } from '../parser/index.js'

/** The names, each with no constraint of its own. */
function unconstrained(names: readonly string[]) {
  return Object.fromEntries(names.map((name) => [name, {}]))
}

/**
 * A node with `allOf` / `anyOf` / `oneOf` and an `additionalProperties` other than `true`
 * beside it, as an `allOf` of the node without that keyword and an object member that holds
 * it as `unevaluatedProperties`. The member names the node's own `properties` and
 * `patternProperties` (with no constraint of their own, which the node keeps), so only the
 * keys those leave are held to `additionalProperties`, as JSON Schema reads it (#138). `undefined` when the node has no
 * such pair.
 */
export function additionalBesideCombinator(schema: JSONSchema): JSONSchema | undefined {
  const { additionalProperties, ...rest } = schema
  if (additionalProperties === undefined || additionalProperties === true) return undefined
  if (schema.allOf === undefined && schema.anyOf === undefined && schema.oneOf === undefined) {
    return undefined
  }
  // An `unevaluatedProperties` beside an `allOf` of one bare object evaluates exactly the
  // keys named here; the generators check it on the input before an object strips a key.
  const keys: JSONSchema = {
    allOf: [{ type: 'object' }],
    ...(schema.properties !== undefined && {
      properties: unconstrained(Object.keys(schema.properties)),
    }),
    ...(schema.patternProperties !== undefined && {
      patternProperties: unconstrained(Object.keys(schema.patternProperties)),
    }),
    unevaluatedProperties: additionalProperties,
    ...(schema['x-additionalProperties-message'] !== undefined && {
      'x-unevaluatedProperties-message': schema['x-additionalProperties-message'],
    }),
    ...(schema.nullable === true && { nullable: true }),
  }
  return { allOf: [rest, keys] }
}
