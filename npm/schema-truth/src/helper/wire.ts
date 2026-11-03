import {
  INTEGER_WIRE_PATTERN,
  NUMBER_WIRE_PATTERN,
  STRINGBOOL_PATTERN,
  STRINGBOOL_TRUTHY_PATTERN,
  WIRE_PRIMITIVE_ORDER,
} from '../constants/index.js'
import {
  canBeNull,
  canBeString,
  hasCombinator,
  hasNumericKeyword,
  hasStringKeyword,
  isNullable,
} from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { regexSource } from './format.js'

/**
 * What the generators share about a value read off the string wire — a query, path,
 * header, cookie or form field — beyond the coercion each library spells its own way.
 */

/** The `type` a typeless wire node reads its text as, from the constraints it carries. */
export function impliedWireType(schema: JSONSchema): 'number' | 'string' | undefined {
  if (
    schema.type !== undefined ||
    hasCombinator(schema) ||
    schema.const !== undefined ||
    schema.enum !== undefined ||
    schema.properties !== undefined
  ) {
    return undefined
  }
  const isNumeric = hasNumericKeyword(schema)
  const isString = hasStringKeyword(schema)
  if (isNumeric && !isString) return 'number'
  if (isString && !isNumeric) return 'string'
  return undefined
}

/**
 * The primitive members of a `type` list as a union would list them: `number` already
 * takes every integer, so the two together are one member, and on the wire every member
 * reads text, so the string member is tried last.
 */
export function unionPrimitiveTypes(types: readonly string[], isWire: boolean): readonly string[] {
  const ordered = isWire ? WIRE_PRIMITIVE_ORDER.filter((t) => types.includes(t)) : types
  return ordered.filter(
    (t) =>
      (t === 'string' || t === 'number' || t === 'boolean' || t === 'integer') &&
      !(t === 'integer' && types.includes('number')),
  )
}

/** Whether a `type` list is a union of primitives alone: more than one, and no array or object. */
export function isPrimitiveUnion(types: readonly string[], isWire: boolean): boolean {
  return (
    unionPrimitiveTypes(types, isWire).length > 1 &&
    !types.includes('array') &&
    !types.includes('object')
  )
}

/**
 * Whether the text `null` has to be read ahead of a wire node: it takes `null`, and no
 * string, so `null` can only be the value and never the text.
 */
export function isNullTextRead(schema: JSONSchema): boolean {
  return canBeNull(schema) && !canBeString(schema)
}

/**
 * Whether a node matches `null` before its members coerce it: a nullable type, or a
 * `null` among its literals. A combinator coerces `null` to `0` or `false` before a
 * `null` member is tried, so the null has to be matched ahead of it instead.
 */
export function isNullMatchedFirst(schema: JSONSchema): boolean {
  return isNullable(schema) || schema.const === null || schema.enum?.includes(null) === true
}

/** A wire array sent once arrives as its one element: wrapped, it is an array of one. */
export function wireArrayOnce(param: string): string {
  return `(${param})=>(${param}===undefined||Array.isArray(${param})?${param}:[${param}])`
}

/** The text `null` on the wire, read as the `null` a nullable non-string schema takes. */
export function wireNullText(param: string): string {
  return `(${param})=>(${param}==='null'?null:${param})`
}

/**
 * A parameter object answers an `Object.prototype` name it was not sent with the inherited
 * member. Copied onto a null-prototype object, it holds only what the request carried.
 */
export function ownProperties(param: string): string {
  return `(${param})=>(typeof ${param}==="object"&&${param}!==null&&!Array.isArray(${param})?Object.assign(Object.create(null),${param}):${param})`
}

/** The regex literal of integer text on the wire. */
export function integerWirePattern(): string {
  return regexSource(INTEGER_WIRE_PATTERN)
}

/** The regex literal of JSON number text on the wire. */
export function numberWirePattern(): string {
  return regexSource(NUMBER_WIRE_PATTERN)
}

/**
 * Whether wire text for these literals is an integer or a number. An integer rejects
 * exponents and fractions; a number follows the JSON number grammar.
 */
export function wireNumericKind(
  schema: JSONSchema,
  values: readonly unknown[],
): 'integer' | 'number' {
  const types = schema.type
  if (types === 'number') return 'number'
  if (types === 'integer') return 'integer'
  if (Array.isArray(types) && types.includes('number')) return 'number'
  if (Array.isArray(types) && types.includes('integer')) return 'integer'
  if (values.every((value) => typeof value === 'number' && Number.isInteger(value))) {
    return 'integer'
  }
  return 'number'
}

/** The regex literal of every spelling of a boolean on the wire. */
export function stringboolPattern(): string {
  return regexSource(STRINGBOOL_PATTERN)
}

/** The regex literal of the spellings that read as `true`. */
export function stringboolTruthyPattern(): string {
  return regexSource(STRINGBOOL_TRUTHY_PATTERN)
}

/**
 * A default value as it is spelled on the string wire, where a coerced schema's input
 * is text: a scalar as its text, an array element by element, `null` and objects as
 * they are.
 */
export function wireDefaultValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(wireDefaultValue)
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return value
}
