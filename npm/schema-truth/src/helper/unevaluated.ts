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
 * `anyOf` / `if` / `then` / `else` / `dependentSchemas` member (`then` and `else` only beside
 * an `if`), a `$ref` read as the
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
    // `then` and `else` do nothing without an `if`, and `if` evaluates what it declares.
    ...(schema.if === undefined
      ? []
      : [schema.if, schema.then, schema.else].filter((member) => member !== undefined)),
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

/** The keys a branch evaluates when it applies, or `all` when every key then is. */
type BranchEvaluated = EvaluatedProperties | 'all'

/**
 * The keys an object's own key check reads, branch by branch (JSON Schema 2020-12 §11.3):
 * its own `properties` and `patternProperties`, and, for `unevaluatedProperties` without
 * `additionalProperties`, those an `if` / `then` / `else` or a `dependentSchemas` entry
 * declares, each counted only where that branch applies. `additionalProperties` reads
 * only the own keys.
 */
export type ObjectEvaluatedKeys = {
  readonly own: EvaluatedProperties
  /** The keys `if` and `then` evaluate when `if` passes, and `else` when it fails. */
  readonly conditional?: { readonly passed: BranchEvaluated; readonly failed: BranchEvaluated }
  /** The keys a `dependentSchemas` entry evaluates when its key is present. */
  readonly dependent: readonly (readonly [key: string, evaluated: BranchEvaluated])[]
}

/** The keys the members evaluate beyond the object's own (`own`), or `all`. */
function branchEvaluated(
  members: readonly (JSONSchema | undefined)[],
  own: EvaluatedProperties,
  definitions: SchemaDefinitions | undefined,
): BranchEvaluated {
  const names = new Set<string>()
  const patterns = new Set<string>()
  for (const member of members) {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- the document is parsed JSON, never checked against the type: a null can sit where the type says a schema
    if (typeof member !== 'object' || member === null) continue
    const evaluated = evaluatedProperties(member, definitions)
    if (evaluated === undefined) return 'all'
    for (const name of evaluated.names) names.add(name)
    for (const pattern of evaluated.patterns) patterns.add(pattern)
  }
  return {
    names: [...names].filter((name) => !own.names.includes(name)),
    patterns: [...patterns].filter((pattern) => !own.patterns.includes(pattern)),
  }
}

function isEmptyBranch(evaluated: BranchEvaluated) {
  return evaluated !== 'all' && evaluated.names.length === 0 && evaluated.patterns.length === 0
}

/** The keys an object's own key check reads, branch by branch ({@link ObjectEvaluatedKeys}). */
export function objectEvaluatedKeys(
  schema: JSONSchema,
  definitions: SchemaDefinitions | undefined,
): ObjectEvaluatedKeys {
  const own = {
    names: Object.keys(schema.properties ?? {}),
    patterns: Object.keys(schema.patternProperties ?? {}),
  }
  if (schema.additionalProperties !== undefined || schema.unevaluatedProperties === undefined) {
    return { own, dependent: [] }
  }
  // `then` and `else` do nothing without an `if`.
  const conditional =
    schema.if === undefined
      ? undefined
      : {
          passed: branchEvaluated([schema.if, schema.then], own, definitions),
          failed: branchEvaluated([schema.else], own, definitions),
        }
  const dependent = Object.entries(schema.dependentSchemas ?? {}).map(
    ([key, member]) => [key, branchEvaluated([member], own, definitions)] as const,
  )
  return { own, ...(conditional && { conditional }), dependent }
}

/** Whether a branch of the object evaluates a key, so its own keys are not all it allows. */
export function hasBranchKeys(keys: ObjectEvaluatedKeys) {
  return (
    (keys.conditional !== undefined &&
      (!isEmptyBranch(keys.conditional.passed) || !isEmptyBranch(keys.conditional.failed))) ||
    keys.dependent.some(([, evaluated]) => !isEmptyBranch(evaluated))
  )
}

function branchCheck(condition: string, evaluated: BranchEvaluated, key: string) {
  if (evaluated === 'all') return condition
  const isEvaluated = isEvaluatedKeyExpression(evaluated, key)
  return isEvaluated === undefined ? undefined : `(${condition}&&(${isEvaluated}))`
}

/**
 * The emitted expression that tells whether `key` of `input` is evaluated: an own key, or
 * one a branch that applies declares. `ifPasses` is the target's test of `input` against
 * the `if` schema. `undefined` when no key is evaluated.
 */
export function isEvaluatedObjectKeyExpression(
  keys: ObjectEvaluatedKeys,
  key: string,
  input: string,
  ifPasses: () => string,
) {
  const checks = [
    isEvaluatedKeyExpression(keys.own, key),
    ...(keys.conditional === undefined
      ? []
      : [
          branchCheck(ifPasses(), keys.conditional.passed, key),
          branchCheck(`!${ifPasses()}`, keys.conditional.failed, key),
        ]),
    ...keys.dependent.map(([dependentKey, evaluated]) =>
      branchCheck(`${JSON.stringify(dependentKey)} in ${input}`, evaluated, key),
    ),
  ].filter((check) => check !== undefined)
  return checks.length > 0 ? checks.join('||') : undefined
}
