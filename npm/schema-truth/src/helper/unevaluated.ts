import { DEFINITION_REF_PREFIXES } from '../constants/index.js'
import type { JSONSchema } from '../parser/index.js'
import type { SchemaDefinitions } from './schema.js'

/** The property names and `patternProperties` patterns a schema evaluates. */
export type EvaluatedProperties = {
  readonly names: readonly string[]
  readonly patterns: readonly string[]
}

function definitionOf(ref: string, definitions: SchemaDefinitions | undefined) {
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
) {
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
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- the document is parsed JSON, never checked against the type: a null can sit where the type says a schema
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
 * plus one `RegExp` test per pattern. With no names the lookup is left out, as `[]` is
 * typed `never[]` and `[].includes(key)` does not type-check; with neither, no key is
 * evaluated and it is `undefined`, so the caller can skip reading the key at all.
 */
export function isEvaluatedKeyExpression(
  evaluated: EvaluatedProperties,
  key: string,
): string | undefined {
  const checks = [
    ...(evaluated.names.length > 0 ? [`${JSON.stringify(evaluated.names)}.includes(${key})`] : []),
    ...evaluated.patterns.map((pattern) => `new RegExp(${JSON.stringify(pattern)}).test(${key})`),
  ]
  return checks.length > 0 ? checks.join('||') : undefined
}

/**
 * The emitted loop body that runs `body` for a key `isEvaluated` does not cover: inside
 * an `if` when some key is evaluated, as it is when none is.
 */
export function unlessEvaluated(isEvaluated: string | undefined, body: string) {
  return isEvaluated === undefined ? body : `if(!(${isEvaluated})){${body}}`
}

/**
 * The emitted check that every key of `input` is one of a `propertyNames` enum. A key is a
 * string, so only the string members can match. With none, no key is allowed and the
 * lookup is left out: `[].includes(key)` does not type-check (`never[]`), and neither does
 * a lookup in a number array.
 */
export function propertyNamesEnumCheck(values: readonly unknown[], input: string) {
  const names = values.filter((value) => typeof value === 'string')
  return names.length === 0
    ? `Object.keys(${input}).length===0`
    : `Object.keys(${input}).every((key)=>${JSON.stringify(names)}.includes(key))`
}

/**
 * The keys an object's own key check treats as evaluated. `additionalProperties` reads only
 * the object's own `properties` and `patternProperties`; `unevaluatedProperties` without it
 * also reads the keys its `then`, `else` and `dependentSchemas` declare
 * ({@link evaluatedProperties}). `undefined` when every key counts as evaluated, so no key
 * is checked.
 */
export function objectEvaluatedKeys(
  schema: JSONSchema,
  definitions: SchemaDefinitions | undefined,
): EvaluatedProperties | undefined {
  if (schema.additionalProperties !== undefined || schema.unevaluatedProperties === undefined) {
    return {
      names: Object.keys(schema.properties ?? {}),
      patterns: Object.keys(schema.patternProperties ?? {}),
    }
  }
  return evaluatedProperties(schema, definitions)
}

/** Whether a branch of the object evaluates a key beyond its own `properties` and patterns. */
export function evaluatesBeyondOwnKeys(schema: JSONSchema, evaluated: EvaluatedProperties) {
  const names = new Set(Object.keys(schema.properties ?? {}))
  const patterns = new Set(Object.keys(schema.patternProperties ?? {}))
  return (
    evaluated.names.some((name) => !names.has(name)) ||
    evaluated.patterns.some((pattern) => !patterns.has(pattern))
  )
}
