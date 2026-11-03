import { DEFINITION_REF_PREFIXES } from '../constants/index.js'
import type { JSONSchema } from '../parser/index.js'
import type { SchemaDefinitions } from './schema.js'

/** The property names and `patternProperties` patterns a schema evaluates. */
export type EvaluatedProperties = {
  readonly names: readonly string[]
  readonly patterns: readonly string[]
}

function definitionOf(
  ref: string,
  definitions: SchemaDefinitions | undefined,
): JSONSchema | undefined {
  if (definitions === undefined) return undefined
  for (const prefix of DEFINITION_REF_PREFIXES) {
    if (!ref.startsWith(prefix)) continue
    const rest = ref.slice(prefix.length)
    if (rest === '' || rest.includes('/')) return undefined
    const name = decodeURIComponent(rest)
    return Object.hasOwn(definitions, name) ? definitions[name] : undefined
  }
  return undefined
}

/**
 * The properties a node evaluates for `unevaluatedProperties` (JSON Schema 2020-12 §11.3):
 * its own `properties` and `patternProperties`, and those of every `allOf` / `oneOf` /
 * `anyOf` / `then` / `else` / `dependentSchemas` member, a `$ref` read as the
 * definition it names. A branch that may not apply counts as evaluated, so a valid value
 * is never refused.
 *
 * `undefined` when every property is evaluated (an `additionalProperties` anywhere) or
 * when that cannot be told (a `$ref` `definitions` does not hold).
 */
export function evaluatedProperties(
  schema: JSONSchema,
  definitions: SchemaDefinitions | undefined,
  reading: ReadonlySet<string> = new Set(),
): EvaluatedProperties | undefined {
  if (schema.additionalProperties !== undefined) return undefined
  const members: JSONSchema[] = [
    ...(schema.allOf ?? []),
    ...(schema.oneOf ?? []),
    ...(schema.anyOf ?? []),
    ...(schema.then === undefined ? [] : [schema.then]),
    ...(schema.else === undefined ? [] : [schema.else]),
    ...Object.values(schema.dependentSchemas ?? {}),
  ]
  const names = new Set(Object.keys(schema.properties ?? {}))
  const patterns = new Set(Object.keys(schema.patternProperties ?? {}))
  // A cycle adds nothing the first visit did not.
  if (schema.$ref !== undefined && !reading.has(schema.$ref)) {
    const target = definitionOf(schema.$ref, definitions)
    if (target === undefined) return undefined
    members.push(target)
  }
  const next = schema.$ref === undefined ? reading : new Set([...reading, schema.$ref])
  for (const member of members) {
    if (typeof member !== 'object' || member === null) continue
    const evaluated = evaluatedProperties(member, definitions, next)
    if (evaluated === undefined) return undefined
    for (const name of evaluated.names) names.add(name)
    for (const pattern of evaluated.patterns) patterns.add(pattern)
  }
  return { names: [...names], patterns: [...patterns] }
}

/**
 * The emitted expression that tells whether `key` is evaluated: a lookup in the names
 * plus one `RegExp` test per pattern.
 */
export function isEvaluatedKeyExpression(evaluated: EvaluatedProperties, key: string): string {
  const checks = [
    `${JSON.stringify(evaluated.names)}.includes(${key})`,
    ...evaluated.patterns.map((pattern) => `new RegExp(${JSON.stringify(pattern)}).test(${key})`),
  ]
  return checks.join('||')
}
