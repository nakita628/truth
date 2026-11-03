import { NUMERIC_KEYWORDS, STRING_KEYWORDS } from '../constants/index.js'
import { hasCombinator, hasNumericKeyword, hasStringKeyword } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { regexLiteral } from './regex.js'

/**
 * An `allOf` member that only carries keywords (`{ minimum: 5 }`, `{ maxLength: 10 }`).
 *
 * It has no type of its own. The keywords still apply to the composed value — a number
 * must meet `minimum`, a string must meet `maxLength` — so dropping the member drops
 * constraints that JSON Schema keeps.
 */

const KEYWORD_ONLY_KEYS = new Set<string>([
  ...NUMERIC_KEYWORDS,
  ...STRING_KEYWORDS,
  'x-error-message',
  'x-minimum-message',
  'x-maximum-message',
  'x-exclusiveMinimum-message',
  'x-exclusiveMaximum-message',
  'x-multipleOf-message',
  'x-minLength-message',
  'x-maxLength-message',
  'x-pattern-message',
  'title',
  'description',
  '$comment',
  'examples',
  'example',
  'deprecated',
  'readOnly',
  'writeOnly',
])

/** Whether every key of `schema` is a numeric or string keyword, its message, or an annotation. */
export function isKeywordOnlyMember(schema: JSONSchema): boolean {
  const keys = Object.keys(schema)
  if (keys.length === 0) return false
  if (!keys.every((key) => KEYWORD_ONLY_KEYS.has(key))) return false
  return hasNumericKeyword(schema) || hasStringKeyword(schema)
}

/** The message a keyword-only member should report, keyword messages falling back together. */
export function constraintMessage(schema: JSONSchema): string | undefined {
  return (
    schema['x-error-message'] ??
    schema['x-minimum-message'] ??
    schema['x-maximum-message'] ??
    schema['x-exclusiveMinimum-message'] ??
    schema['x-exclusiveMaximum-message'] ??
    schema['x-multipleOf-message'] ??
    schema['x-minLength-message'] ??
    schema['x-maxLength-message'] ??
    schema['x-pattern-message']
  )
}

/**
 * The predicate that keeps a keyword-only member's constraints without forcing a type.
 *
 * A number that fails `minimum` is rejected; a string is not a number, so `minimum` does
 * not apply to it. `param` is the value name the caller already uses.
 */
export function constraintPredicate(schema: JSONSchema, param: string): string {
  const parts = [numericGuard(schema, param), stringGuard(schema, param)].filter(
    (part) => part !== '',
  )
  if (parts.length === 0) return 'true'
  return parts.join(' && ')
}

type Bound = { readonly value: number; readonly exclusive: boolean }

/**
 * Fold keyword-only `allOf` members into a sibling whose type they constrain.
 *
 * `{ type: 'integer' }` beside `{ minimum: 5 }` is one integer of at least 5. A keyword
 * with no such sibling stays keyword-only, so the caller emits a type-guarded check. On
 * the string wire a leftover is given the type its keywords imply, and one coercion
 * reads the text.
 */
export function foldAllOfMembers(
  members: readonly JSONSchema[],
  isWire: boolean,
): readonly JSONSchema[] {
  let numericAt = -1
  let stringAt = -1
  for (const [index, member] of members.entries()) {
    if (numericAt === -1 && isNumericHost(member)) numericAt = index
    if (stringAt === -1 && isStringHost(member)) stringAt = index
  }
  const next = [...members]
  const numericLeftovers: JSONSchema[] = []
  const stringLeftovers: JSONSchema[] = []
  const drop = new Set<number>()
  for (const [index, member] of members.entries()) {
    if (!isKeywordOnlyMember(member)) continue
    drop.add(index)
    const numeric = numericPart(member)
    const text = stringPart(member)
    if (numeric !== undefined) {
      const host = numericAt === -1 ? undefined : next[numericAt]
      const absorbed = host === undefined ? undefined : tryAbsorbNumeric(host, numeric)
      if (host !== undefined && absorbed !== undefined) next[numericAt] = absorbed
      else numericLeftovers.push(numeric)
    }
    if (text !== undefined) {
      const host = stringAt === -1 ? undefined : next[stringAt]
      const absorbed = host === undefined ? undefined : tryAbsorbString(host, text)
      if (host !== undefined && absorbed !== undefined) next[stringAt] = absorbed
      else stringLeftovers.push(text)
    }
  }
  const kept: JSONSchema[] = []
  for (const [index, member] of next.entries()) {
    if (!drop.has(index)) kept.push(member)
  }
  return [
    ...kept,
    ...collapse(numericLeftovers, 'number', isWire),
    ...collapse(stringLeftovers, 'string', isWire),
  ]
}

function isNumericHost(schema: JSONSchema): boolean {
  if (schema.type !== 'number' && schema.type !== 'integer') return false
  if (schema.$ref !== undefined || hasCombinator(schema)) return false
  if (schema.properties !== undefined || schema.enum !== undefined || 'const' in schema) {
    return false
  }
  return true
}

function isStringHost(schema: JSONSchema): boolean {
  if (schema.type !== 'string') return false
  if (schema.$ref !== undefined || hasCombinator(schema)) return false
  if (schema.properties !== undefined || schema.enum !== undefined || 'const' in schema) {
    return false
  }
  return true
}

function numericPart(schema: JSONSchema): JSONSchema | undefined {
  if (!hasNumericKeyword(schema)) return undefined
  return {
    ...(schema.minimum !== undefined ? { minimum: schema.minimum } : {}),
    ...(schema.maximum !== undefined ? { maximum: schema.maximum } : {}),
    ...(schema.exclusiveMinimum !== undefined ? { exclusiveMinimum: schema.exclusiveMinimum } : {}),
    ...(schema.exclusiveMaximum !== undefined ? { exclusiveMaximum: schema.exclusiveMaximum } : {}),
    ...(schema.multipleOf !== undefined ? { multipleOf: schema.multipleOf } : {}),
    ...(schema['x-minimum-message'] !== undefined
      ? { 'x-minimum-message': schema['x-minimum-message'] }
      : {}),
    ...(schema['x-maximum-message'] !== undefined
      ? { 'x-maximum-message': schema['x-maximum-message'] }
      : {}),
    ...(schema['x-exclusiveMinimum-message'] !== undefined
      ? { 'x-exclusiveMinimum-message': schema['x-exclusiveMinimum-message'] }
      : {}),
    ...(schema['x-exclusiveMaximum-message'] !== undefined
      ? { 'x-exclusiveMaximum-message': schema['x-exclusiveMaximum-message'] }
      : {}),
    ...(schema['x-multipleOf-message'] !== undefined
      ? { 'x-multipleOf-message': schema['x-multipleOf-message'] }
      : {}),
  }
}

function stringPart(schema: JSONSchema): JSONSchema | undefined {
  if (!hasStringKeyword(schema)) return undefined
  return {
    ...(schema.minLength !== undefined ? { minLength: schema.minLength } : {}),
    ...(schema.maxLength !== undefined ? { maxLength: schema.maxLength } : {}),
    ...(schema.pattern !== undefined ? { pattern: schema.pattern } : {}),
    ...(schema['x-minLength-message'] !== undefined
      ? { 'x-minLength-message': schema['x-minLength-message'] }
      : {}),
    ...(schema['x-maxLength-message'] !== undefined
      ? { 'x-maxLength-message': schema['x-maxLength-message'] }
      : {}),
    ...(schema['x-pattern-message'] !== undefined
      ? { 'x-pattern-message': schema['x-pattern-message'] }
      : {}),
  }
}

function tryAbsorbNumeric(host: JSONSchema, extra: JSONSchema): JSONSchema | undefined {
  if (!canAbsorbMultipleOf(host, extra)) return undefined
  return absorbMultipleOf(absorbUpper(absorbLower(host, extra), extra), extra)
}

function tryAbsorbString(host: JSONSchema, extra: JSONSchema): JSONSchema | undefined {
  if (
    typeof extra.pattern === 'string' &&
    typeof host.pattern === 'string' &&
    extra.pattern !== host.pattern
  ) {
    return undefined
  }
  return absorbString(host, extra)
}

function canAbsorbMultipleOf(host: JSONSchema, extra: JSONSchema): boolean {
  if (typeof extra.multipleOf !== 'number' || typeof host.multipleOf !== 'number') return true
  if (host.multipleOf === extra.multipleOf) return true
  return leastCommonMultiple(host.multipleOf, extra.multipleOf) !== undefined
}

function absorbLower(host: JSONSchema, extra: JSONSchema): JSONSchema {
  const extraBound = lowerBound(extra)
  if (extraBound === undefined) return host
  const hostBound = lowerBound(host)
  if (hostBound !== undefined && !isStricter(extraBound, hostBound, 'lower')) return host
  return withLower(host, extraBound, boundMessage(extra, extraBound, 'lower'))
}

function absorbUpper(host: JSONSchema, extra: JSONSchema): JSONSchema {
  const extraBound = upperBound(extra)
  if (extraBound === undefined) return host
  const hostBound = upperBound(host)
  if (hostBound !== undefined && !isStricter(extraBound, hostBound, 'upper')) return host
  return withUpper(host, extraBound, boundMessage(extra, extraBound, 'upper'))
}

function absorbMultipleOf(host: JSONSchema, extra: JSONSchema): JSONSchema {
  if (typeof extra.multipleOf !== 'number') return host
  if (typeof host.multipleOf !== 'number') {
    return {
      ...host,
      multipleOf: extra.multipleOf,
      ...(extra['x-multipleOf-message'] !== undefined
        ? { 'x-multipleOf-message': extra['x-multipleOf-message'] }
        : {}),
    }
  }
  if (host.multipleOf === extra.multipleOf) return host
  const multiple = leastCommonMultiple(host.multipleOf, extra.multipleOf)
  if (multiple === undefined) return host
  const { 'x-multipleOf-message': message, ...rest } = host
  void message
  return { ...rest, multipleOf: multiple }
}

function absorbString(host: JSONSchema, extra: JSONSchema): JSONSchema {
  let next = host
  if (
    typeof extra.minLength === 'number' &&
    (next.minLength === undefined || extra.minLength > next.minLength)
  ) {
    next = {
      ...next,
      minLength: extra.minLength,
      ...(extra['x-minLength-message'] !== undefined
        ? { 'x-minLength-message': extra['x-minLength-message'] }
        : {}),
    }
  }
  if (
    typeof extra.maxLength === 'number' &&
    (next.maxLength === undefined || extra.maxLength < next.maxLength)
  ) {
    next = {
      ...next,
      maxLength: extra.maxLength,
      ...(extra['x-maxLength-message'] !== undefined
        ? { 'x-maxLength-message': extra['x-maxLength-message'] }
        : {}),
    }
  }
  if (typeof extra.pattern === 'string' && next.pattern === undefined) {
    next = {
      ...next,
      pattern: extra.pattern,
      ...(extra['x-pattern-message'] !== undefined
        ? { 'x-pattern-message': extra['x-pattern-message'] }
        : {}),
    }
  }
  return next
}

function collapse(
  parts: readonly JSONSchema[],
  kind: 'number' | 'string',
  isWire: boolean,
): readonly JSONSchema[] {
  const groups: JSONSchema[] = []
  for (const part of parts) {
    const last = groups.at(-1)
    const absorbed =
      last === undefined
        ? undefined
        : kind === 'number'
          ? tryAbsorbNumeric(last, part)
          : tryAbsorbString(last, part)
    if (last === undefined || absorbed === undefined) {
      groups.push(isWire ? { ...part, type: kind } : part)
      continue
    }
    groups[groups.length - 1] = absorbed
  }
  return groups
}

function lowerBound(schema: JSONSchema): Bound | undefined {
  if (typeof schema.exclusiveMinimum === 'number') {
    return { value: schema.exclusiveMinimum, exclusive: true }
  }
  if (typeof schema.minimum === 'number') {
    return { value: schema.minimum, exclusive: schema.exclusiveMinimum === true }
  }
  return undefined
}

function upperBound(schema: JSONSchema): Bound | undefined {
  if (typeof schema.exclusiveMaximum === 'number') {
    return { value: schema.exclusiveMaximum, exclusive: true }
  }
  if (typeof schema.maximum === 'number') {
    return { value: schema.maximum, exclusive: schema.exclusiveMaximum === true }
  }
  return undefined
}

function isStricter(next: Bound, current: Bound, direction: 'lower' | 'upper'): boolean {
  if (next.value !== current.value) {
    return direction === 'lower' ? next.value > current.value : next.value < current.value
  }
  return next.exclusive && !current.exclusive
}

function boundMessage(
  schema: JSONSchema,
  bound: Bound,
  direction: 'lower' | 'upper',
): string | undefined {
  if (direction === 'lower') {
    return bound.exclusive ? schema['x-exclusiveMinimum-message'] : schema['x-minimum-message']
  }
  return bound.exclusive ? schema['x-exclusiveMaximum-message'] : schema['x-maximum-message']
}

function dropLower(schema: JSONSchema): JSONSchema {
  const {
    minimum,
    exclusiveMinimum,
    'x-minimum-message': minimumMessage,
    'x-exclusiveMinimum-message': exclusiveMinimumMessage,
    ...rest
  } = schema
  void minimum
  void exclusiveMinimum
  void minimumMessage
  void exclusiveMinimumMessage
  return rest
}

function dropUpper(schema: JSONSchema): JSONSchema {
  const {
    maximum,
    exclusiveMaximum,
    'x-maximum-message': maximumMessage,
    'x-exclusiveMaximum-message': exclusiveMaximumMessage,
    ...rest
  } = schema
  void maximum
  void exclusiveMaximum
  void maximumMessage
  void exclusiveMaximumMessage
  return rest
}

function withLower(schema: JSONSchema, bound: Bound, message: string | undefined): JSONSchema {
  const base = dropLower(schema)
  if (bound.exclusive) {
    return {
      ...base,
      exclusiveMinimum: bound.value,
      ...(message !== undefined ? { 'x-exclusiveMinimum-message': message } : {}),
    }
  }
  return {
    ...base,
    minimum: bound.value,
    ...(message !== undefined ? { 'x-minimum-message': message } : {}),
  }
}

function withUpper(schema: JSONSchema, bound: Bound, message: string | undefined): JSONSchema {
  const base = dropUpper(schema)
  if (bound.exclusive) {
    return {
      ...base,
      exclusiveMaximum: bound.value,
      ...(message !== undefined ? { 'x-exclusiveMaximum-message': message } : {}),
    }
  }
  return {
    ...base,
    maximum: bound.value,
    ...(message !== undefined ? { 'x-maximum-message': message } : {}),
  }
}

function leastCommonMultiple(left: number, right: number): number | undefined {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right) || left === 0 || right === 0) {
    return undefined
  }
  const divisor = greatestCommonDivisor(Math.abs(left), Math.abs(right))
  const multiple = (Math.abs(left) / divisor) * Math.abs(right)
  if (!Number.isSafeInteger(multiple)) return undefined
  return multiple
}

function greatestCommonDivisor(left: number, right: number): number {
  let x = left
  let y = right
  while (y !== 0) {
    const next = x % y
    x = y
    y = next
  }
  return x
}

function numericGuard(schema: JSONSchema, param: string): string {
  const checks: string[] = []
  if (typeof schema.minimum === 'number' && schema.exclusiveMinimum !== true) {
    checks.push(`${param} >= ${schema.minimum}`)
  }
  if (schema.exclusiveMinimum === true && typeof schema.minimum === 'number') {
    checks.push(`${param} > ${schema.minimum}`)
  }
  if (typeof schema.exclusiveMinimum === 'number') {
    checks.push(`${param} > ${schema.exclusiveMinimum}`)
  }
  if (typeof schema.maximum === 'number' && schema.exclusiveMaximum !== true) {
    checks.push(`${param} <= ${schema.maximum}`)
  }
  if (schema.exclusiveMaximum === true && typeof schema.maximum === 'number') {
    checks.push(`${param} < ${schema.maximum}`)
  }
  if (typeof schema.exclusiveMaximum === 'number') {
    checks.push(`${param} < ${schema.exclusiveMaximum}`)
  }
  if (typeof schema.multipleOf === 'number') checks.push(`${param} % ${schema.multipleOf} === 0`)
  if (checks.length === 0) return ''
  return `(typeof ${param} !== 'number' || (${checks.join(' && ')}))`
}

function stringGuard(schema: JSONSchema, param: string): string {
  const checks: string[] = []
  if (typeof schema.minLength === 'number') checks.push(`${param}.length >= ${schema.minLength}`)
  if (typeof schema.maxLength === 'number') checks.push(`${param}.length <= ${schema.maxLength}`)
  if (typeof schema.pattern === 'string') {
    checks.push(`${regexLiteral(schema.pattern)}.test(${param})`)
  }
  if (checks.length === 0) return ''
  return `(typeof ${param} !== 'string' || (${checks.join(' && ')}))`
}
