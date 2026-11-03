import type { JSONSchema } from '../parser/index.js'
import { normalizeTypes } from '../utils/index.js'

/** Whether the schema's values are bigints (`int64`, `uint64`, `bigint`). */
export function isBigintFormat(schema: JSONSchema): boolean {
  return schema.format === 'int64' || schema.format === 'uint64' || schema.format === 'bigint'
}

/** A value as a TypeScript literal. Numbers of a bigint schema are `0n`, not `0`. */
function literal(value: unknown, bigint: boolean): string {
  if (bigint && typeof value === 'number' && Number.isFinite(value)) return `${value}n`
  return JSON.stringify(value)
}

/**
 * An `enum` as an array literal. A bigint schema's numbers are bigint literals, so
 * `[0n].includes(val)` type-checks and rejects `0n`; `[0].includes(0n)` is both a
 * type error and always false.
 */
export function valueListLiteral(values: readonly unknown[], bigint: boolean): string {
  if (!bigint) return JSON.stringify(values)
  return `[${values.map((value) => literal(value, true)).join(',')}]`
}

/** The `not` predicate bodies by `type`, over a value bound to `param`. */
function notTypeBody(type: string, param: string): string | undefined {
  switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
      return `typeof ${param} !== '${type}'`
    case 'integer':
      return `typeof ${param} !== 'number' || !Number.isInteger(${param})`
    case 'array':
      return `!Array.isArray(${param})`
    case 'object':
      return `typeof ${param} !== 'object' || ${param} === null || Array.isArray(${param})`
    case 'null':
      return `${param} !== null`
    default:
      return undefined
  }
}

/**
 * The predicate refusing what a `not` schema describes, as the source of an arrow over
 * `param` (declared as `parameter`, which may carry a type annotation): a `const` is
 * refused by value, a `type` by its runtime check, a list of types by every check at
 * once. `bigint` spells a numeric `const` as a bigint literal. `undefined` for a `not`
 * these shared cases do not cover — an `enum` or a combinator, which each generator
 * spells with its own parser.
 */
export function notPredicate(
  inner: JSONSchema,
  param: string,
  parameter: string = param,
  bigint = false,
): string | undefined {
  if ('const' in inner) return `(${parameter}) => ${param} !== ${literal(inner.const, bigint)}`
  if (typeof inner.type === 'string') {
    const body = notTypeBody(inner.type, param)
    return body === undefined ? undefined : `(${parameter}) => ${body}`
  }
  if (Array.isArray(inner.type)) {
    const bodies = normalizeTypes(inner.type)
      .map((t) => notTypeBody(t, param))
      .filter((body) => body !== undefined)
      .map((body) => `(${body})`)
    if (bodies.length > 0) return `(${parameter}) => ${bodies.join(' && ')}`
  }
  return undefined
}
