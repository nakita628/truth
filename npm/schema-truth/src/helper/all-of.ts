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
export function isKeywordOnlyMember(schema: JSONSchema) {
  const keys = Object.keys(schema)
  if (keys.length === 0) return false
  if (!keys.every((key) => KEYWORD_ONLY_KEYS.has(key))) return false
  return hasNumericKeyword(schema) || hasStringKeyword(schema)
}

/** The message a keyword-only member should report, keyword messages falling back together. */
export function constraintMessage(schema: JSONSchema) {
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
export function constraintPredicate(schema: JSONSchema, param: string) {
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
export function foldAllOfMembers(members: readonly JSONSchema[], isWire: boolean) {
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

function isNumericHost(schema: JSONSchema) {
  if (schema.type !== 'number' && schema.type !== 'integer') return false
  if (schema.$ref !== undefined || hasCombinator(schema)) return false
  if (schema.properties !== undefined || schema.enum !== undefined || 'const' in schema) {
    return false
  }
  return true
}

function isStringHost(schema: JSONSchema) {
  if (schema.type !== 'string') return false
  if (schema.$ref !== undefined || hasCombinator(schema)) return false
  if (schema.properties !== undefined || schema.enum !== undefined || 'const' in schema) {
    return false
  }
  return true
}

type MessageKeyword =
  | 'minimum'
  | 'maximum'
  | 'exclusiveMinimum'
  | 'exclusiveMaximum'
  | 'multipleOf'
  | 'minLength'
  | 'maxLength'
  | 'pattern'

/**
 * The message a member's keyword reports: its own `x-<keyword>-message`, or else the
 * member's `x-error-message`, which covers every check the member adds once it is folded
 * into a host or merged with other leftovers.
 */
function keywordMessage(schema: JSONSchema, keyword: MessageKeyword) {
  const message = [schema[`x-${keyword}-message`], schema['x-error-message']].find(
    (candidate) => typeof candidate === 'string',
  )
  return message === undefined ? {} : { [`x-${keyword}-message`]: message }
}

function numericPart(schema: JSONSchema) {
  if (!hasNumericKeyword(schema)) return undefined
  return {
    ...(schema.minimum !== undefined
      ? { minimum: schema.minimum, ...keywordMessage(schema, 'minimum') }
      : {}),
    ...(schema.maximum !== undefined
      ? { maximum: schema.maximum, ...keywordMessage(schema, 'maximum') }
      : {}),
    ...(schema.exclusiveMinimum !== undefined
      ? {
          exclusiveMinimum: schema.exclusiveMinimum,
          ...keywordMessage(schema, 'exclusiveMinimum'),
        }
      : {}),
    ...(schema.exclusiveMaximum !== undefined
      ? {
          exclusiveMaximum: schema.exclusiveMaximum,
          ...keywordMessage(schema, 'exclusiveMaximum'),
        }
      : {}),
    ...(schema.multipleOf !== undefined
      ? { multipleOf: schema.multipleOf, ...keywordMessage(schema, 'multipleOf') }
      : {}),
  }
}

function stringPart(schema: JSONSchema) {
  if (!hasStringKeyword(schema)) return undefined
  return {
    ...(schema.minLength !== undefined
      ? { minLength: schema.minLength, ...keywordMessage(schema, 'minLength') }
      : {}),
    ...(schema.maxLength !== undefined
      ? { maxLength: schema.maxLength, ...keywordMessage(schema, 'maxLength') }
      : {}),
    ...(schema.pattern !== undefined
      ? { pattern: schema.pattern, ...keywordMessage(schema, 'pattern') }
      : {}),
  }
}

function tryAbsorbNumeric(host: JSONSchema, extra: JSONSchema) {
  if (!canAbsorbMultipleOf(host, extra)) return undefined
  return absorbMultipleOf(absorbUpper(absorbLower(host, extra), extra), extra)
}

function tryAbsorbString(host: JSONSchema, extra: JSONSchema) {
  if (
    typeof extra.pattern === 'string' &&
    typeof host.pattern === 'string' &&
    extra.pattern !== host.pattern
  ) {
    return undefined
  }
  return absorbString(host, extra)
}

function canAbsorbMultipleOf(host: JSONSchema, extra: JSONSchema) {
  if (typeof extra.multipleOf !== 'number' || typeof host.multipleOf !== 'number') return true
  if (host.multipleOf === extra.multipleOf) return true
  return leastCommonMultiple(host.multipleOf, extra.multipleOf) !== undefined
}

/**
 * The host with the member's lower bound when it is the stricter. On an equal bound the
 * host keeps its own, and takes the member's message when it has none of its own.
 */
function absorbLower(host: JSONSchema, extra: JSONSchema) {
  const extraBound = lowerBound(extra)
  if (extraBound === undefined) return host
  const hostBound = lowerBound(host)
  const extraMessage = boundMessage(extra, extraBound, 'lower')
  if (hostBound !== undefined && !isStricter(extraBound, hostBound, 'lower')) {
    return isSameBound(hostBound, extraBound) &&
      !hasOwnBoundMessage(host, hostBound, 'lower') &&
      extraMessage !== undefined
      ? withLower(host, hostBound, extraMessage)
      : host
  }
  return withLower(host, extraBound, extraMessage)
}

/** {@link absorbLower} for the upper bound. */
function absorbUpper(host: JSONSchema, extra: JSONSchema) {
  const extraBound = upperBound(extra)
  if (extraBound === undefined) return host
  const hostBound = upperBound(host)
  const extraMessage = boundMessage(extra, extraBound, 'upper')
  if (hostBound !== undefined && !isStricter(extraBound, hostBound, 'upper')) {
    return isSameBound(hostBound, extraBound) &&
      !hasOwnBoundMessage(host, hostBound, 'upper') &&
      extraMessage !== undefined
      ? withUpper(host, hostBound, extraMessage)
      : host
  }
  return withUpper(host, extraBound, extraMessage)
}

/**
 * Whether the host reports its own message for `bound`: the exact keyword's, or its
 * `x-error-message`, which a generator falls back to for every check.
 */
function hasOwnBoundMessage(host: JSONSchema, bound: Bound, direction: 'lower' | 'upper') {
  const keyword =
    direction === 'lower'
      ? bound.exclusive
        ? 'x-exclusiveMinimum-message'
        : 'x-minimum-message'
      : bound.exclusive
        ? 'x-exclusiveMaximum-message'
        : 'x-maximum-message'
  return host[keyword] !== undefined || host['x-error-message'] !== undefined
}

function isSameBound(left: Bound, right: Bound) {
  return left.value === right.value && left.exclusive === right.exclusive
}

/** The member's message for `keyword` when the host has an equal value but no message. */
function equalValueMessage(host: JSONSchema, extra: JSONSchema, keyword: MessageKeyword) {
  const key = `x-${keyword}-message` as const
  const message = extra[key]
  return host[key] === undefined &&
    host['x-error-message'] === undefined &&
    typeof message === 'string'
    ? { [key]: message }
    : {}
}

function absorbMultipleOf(host: JSONSchema, extra: JSONSchema) {
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
  if (host.multipleOf === extra.multipleOf) {
    return { ...host, ...equalValueMessage(host, extra, 'multipleOf') }
  }
  const multiple = leastCommonMultiple(host.multipleOf, extra.multipleOf)
  if (multiple === undefined) return host
  // The combined divisor keeps a message only when both sides report the same one.
  const { 'x-multipleOf-message': message, ...rest } = host
  return message !== undefined && message === extra['x-multipleOf-message']
    ? { ...rest, multipleOf: multiple, 'x-multipleOf-message': message }
    : { ...rest, multipleOf: multiple }
}

function absorbString(host: JSONSchema, extra: JSONSchema) {
  let next = host
  if (typeof extra.minLength === 'number') {
    if (next.minLength === undefined || extra.minLength > next.minLength) {
      next = {
        ...next,
        minLength: extra.minLength,
        ...(extra['x-minLength-message'] !== undefined
          ? { 'x-minLength-message': extra['x-minLength-message'] }
          : {}),
      }
    } else if (extra.minLength === next.minLength) {
      next = { ...next, ...equalValueMessage(next, extra, 'minLength') }
    }
  }
  if (typeof extra.maxLength === 'number') {
    if (next.maxLength === undefined || extra.maxLength < next.maxLength) {
      next = {
        ...next,
        maxLength: extra.maxLength,
        ...(extra['x-maxLength-message'] !== undefined
          ? { 'x-maxLength-message': extra['x-maxLength-message'] }
          : {}),
      }
    } else if (extra.maxLength === next.maxLength) {
      next = { ...next, ...equalValueMessage(next, extra, 'maxLength') }
    }
  }
  if (typeof extra.pattern === 'string') {
    if (next.pattern === undefined) {
      next = {
        ...next,
        pattern: extra.pattern,
        ...(extra['x-pattern-message'] !== undefined
          ? { 'x-pattern-message': extra['x-pattern-message'] }
          : {}),
      }
    } else if (extra.pattern === next.pattern) {
      next = { ...next, ...equalValueMessage(next, extra, 'pattern') }
    }
  }
  return next
}

function collapse(parts: readonly JSONSchema[], kind: 'number' | 'string', isWire: boolean) {
  const groups: JSONSchema[] = []
  for (const part of parts) {
    const last = groups.at(-1)
    // Leftovers become one check with one message, so parts reporting different messages
    // stay apart.
    const absorbed =
      last === undefined || constraintMessage(last) !== constraintMessage(part)
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

/**
 * The stricter of a node's two bounds in one direction: a 2020-12 numeric `exclusiveMinimum`
 * (`exclusiveMaximum`) is a bound of its own beside `minimum` (`maximum`), and both hold.
 */
function strictest(
  inclusive: Bound | undefined,
  exclusive: Bound | undefined,
  direction: 'lower' | 'upper',
) {
  if (inclusive === undefined) return exclusive
  if (exclusive === undefined) return inclusive
  return isStricter(inclusive, exclusive, direction) ? inclusive : exclusive
}

function lowerBound(schema: JSONSchema) {
  return strictest(
    typeof schema.minimum === 'number'
      ? { value: schema.minimum, exclusive: schema.exclusiveMinimum === true }
      : undefined,
    typeof schema.exclusiveMinimum === 'number'
      ? { value: schema.exclusiveMinimum, exclusive: true }
      : undefined,
    'lower',
  )
}

function upperBound(schema: JSONSchema) {
  return strictest(
    typeof schema.maximum === 'number'
      ? { value: schema.maximum, exclusive: schema.exclusiveMaximum === true }
      : undefined,
    typeof schema.exclusiveMaximum === 'number'
      ? { value: schema.exclusiveMaximum, exclusive: true }
      : undefined,
    'upper',
  )
}

function isStricter(next: Bound, current: Bound, direction: 'lower' | 'upper') {
  if (next.value !== current.value) {
    return direction === 'lower' ? next.value > current.value : next.value < current.value
  }
  return next.exclusive && !current.exclusive
}

/**
 * The message of the keyword that gives `bound`, or else of the other keyword in the same
 * direction: a member with both bounds keeps its message whichever bound is the stricter.
 */
function boundMessage(schema: JSONSchema, bound: Bound, direction: 'lower' | 'upper') {
  const [inclusive, exclusive] =
    direction === 'lower'
      ? [schema['x-minimum-message'], schema['x-exclusiveMinimum-message']]
      : [schema['x-maximum-message'], schema['x-exclusiveMaximum-message']]
  return bound.exclusive ? (exclusive ?? inclusive) : (inclusive ?? exclusive)
}

function dropLower(schema: JSONSchema) {
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

function dropUpper(schema: JSONSchema) {
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

function withLower(schema: JSONSchema, bound: Bound, message: string | undefined) {
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

function withUpper(schema: JSONSchema, bound: Bound, message: string | undefined) {
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

function leastCommonMultiple(left: number, right: number) {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right) || left === 0 || right === 0) {
    return undefined
  }
  const divisor = greatestCommonDivisor(Math.abs(left), Math.abs(right))
  const multiple = (Math.abs(left) / divisor) * Math.abs(right)
  if (!Number.isSafeInteger(multiple)) return undefined
  return multiple
}

function greatestCommonDivisor(left: number, right: number) {
  let a = left
  let b = right
  while (b !== 0) {
    const next = a % b
    a = b
    b = next
  }
  return a
}

function numericGuard(schema: JSONSchema, param: string) {
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

function stringGuard(schema: JSONSchema, param: string) {
  const checks: string[] = []
  if (typeof schema.minLength === 'number') checks.push(`${param}.length >= ${schema.minLength}`)
  if (typeof schema.maxLength === 'number') checks.push(`${param}.length <= ${schema.maxLength}`)
  if (typeof schema.pattern === 'string') {
    checks.push(`${regexLiteral(schema.pattern)}.test(${param})`)
  }
  if (checks.length === 0) return ''
  return `(typeof ${param} !== 'string' || (${checks.join(' && ')}))`
}
