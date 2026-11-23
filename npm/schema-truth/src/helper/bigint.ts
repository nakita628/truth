import type { JSONSchema } from '../parser/index.js'
import { definitionOf } from '../utils/index.js'
import type { DefaultSchema } from '../utils/index.js'

/**
 * A schema whose `multipleOf` may be a bigint: a divisor above 2^53 that a number literal
 * cannot hold exactly.
 */
export type BigintSchema = Omit<JSONSchema, 'multipleOf'> & {
  readonly multipleOf?: number | bigint
}

/** A bigint literal, `5n`, spelled in digits however the number prints. */
export function bigintLiteral(n: number | bigint) {
  return `${BigInt(n)}n`
}

/**
 * A schema value (a `default`, an `enum` member) as the literal of a bigint schema: `1e21`
 * is `1000000000000000000000n`, not `1e+21n`, which does not parse. A fractional or
 * non-finite number is no bigint (`BigInt(1.5)` throws) and stays a number literal, which
 * no bigint equals.
 */
export function bigintValueLiteral(n: number) {
  return Number.isInteger(n) ? bigintLiteral(n) : String(n)
}

/**
 * A `BigInt(5)` call, the spelling `format: bigint` has always used. A divisor a number
 * cannot hold exactly is written as a literal, `12345678901234567n`, which keeps every digit.
 */
export function bigintCall(n: number | bigint) {
  return typeof n === 'bigint' ? `${n}n` : `BigInt(${n})`
}

/**
 * A bigint check takes an integer, but a schema's bound can be fractional: `BigInt(0.5)`
 * throws a `RangeError` and `0.5n` does not parse. A fractional bound is rounded to the
 * integer that admits the same bigints: an inclusive minimum and an exclusive maximum
 * round up, an inclusive maximum and an exclusive minimum round down. A non-finite bound
 * (a YAML `.inf`) is left out; `sanitizeSchema` drops it before the generator anyway.
 */
function bigintBound(value: number | undefined, round: 'ceil' | 'floor') {
  return value !== undefined && Number.isFinite(value) ? Math[round](value) : undefined
}

/**
 * The positive integer divisor a bigint `multipleOf` check can use. An integer is taken as
 * it is (`BigInt(value)` is exact for any integer a number holds), and a negative one by its
 * absolute value, which has the same multiples. A bigint `x` is a multiple of `p / q` (in
 * lowest terms) exactly when it is a multiple of `p`, so a fraction reduces to its
 * numerator: 2.5 is 5/2 and becomes `5`. The fraction is read from the number's shortest
 * decimal spelling. Zero or a non-finite divisor has no such integer and is left out (a
 * bigint `% 0n` throws). A reduced divisor a number cannot hold exactly stays a bigint.
 */
export function bigintDivisor(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return undefined
  const magnitude = Math.abs(value)
  if (Number.isInteger(magnitude)) return magnitude
  // A fraction is spelled `0.25` or, below 1e-6, `2.5e-7`.
  const match = /^(\d+)(?:\.(\d+))?(?:e-(\d+))?$/.exec(String(magnitude))
  if (!match) return undefined
  const [, whole = '', fraction = '', exponent = '0'] = match
  const scale = fraction.length + Number(exponent)
  const numerator = BigInt(whole + fraction)
  let [a, b] = [numerator, 10n ** BigInt(scale)]
  while (b !== 0n) [a, b] = [b, a % b]
  const divisor = numerator / a
  return BigInt(Number(divisor)) === divisor ? Number(divisor) : divisor
}

/**
 * The schema with its bounds and `multipleOf` made integers a bigint check can take: see
 * {@link bigintBound} and {@link bigintDivisor}. A bound or divisor that has no such
 * integer is left out, together with the draft-04 boolean or the message that belongs to it.
 */
export function bigintBounds(schema: JSONSchema): BigintSchema {
  const {
    minimum,
    maximum,
    exclusiveMinimum,
    exclusiveMaximum,
    multipleOf,
    'x-multipleOf-message': multipleOfMessage,
    ...rest
  } = schema
  // Draft-04 spells an exclusive bound as `minimum` plus a boolean `exclusiveMinimum`.
  const isExclusiveMin = exclusiveMinimum === true
  const isExclusiveMax = exclusiveMaximum === true
  const min = bigintBound(minimum, isExclusiveMin ? 'floor' : 'ceil')
  const max = bigintBound(maximum, isExclusiveMax ? 'ceil' : 'floor')
  const exMin =
    typeof exclusiveMinimum === 'number'
      ? bigintBound(exclusiveMinimum, 'floor')
      : min !== undefined
        ? exclusiveMinimum
        : undefined
  const exMax =
    typeof exclusiveMaximum === 'number'
      ? bigintBound(exclusiveMaximum, 'ceil')
      : max !== undefined
        ? exclusiveMaximum
        : undefined
  const divisor = bigintDivisor(multipleOf)
  return {
    ...rest,
    ...(min !== undefined && { minimum: min }),
    ...(max !== undefined && { maximum: max }),
    ...(exMin !== undefined && { exclusiveMinimum: exMin }),
    ...(exMax !== undefined && { exclusiveMaximum: exMax }),
    ...(divisor !== undefined && { multipleOf: divisor }),
    ...(divisor !== undefined &&
      multipleOfMessage !== undefined && { 'x-multipleOf-message': multipleOfMessage }),
  }
}

/**
 * Whether a bigint-format node is emitted as bigints. An `enum` or `const` is spelled with
 * bigint literals for `int64` / `uint64` and with number literals for `format: bigint`;
 * any other node is a bigint schema only as an `integer` (a `number` with the format is a
 * plain number schema).
 */
export function isBigintSchema(node: DefaultSchema) {
  if (node.enum !== undefined || node.const !== undefined) return node.format !== 'bigint'
  const types = node.type === undefined ? [] : [node.type].flat()
  return types.includes('integer')
}

/**
 * Whether a default can be written for a node of the given bigint format: a fraction has
 * no bigint spelling, and `BigInt(1.5)` would throw as the generated module loads.
 */
export function isWritableBigintDefault(value: unknown, format: string | undefined) {
  return typeof value !== 'number' || format === undefined || Number.isInteger(value)
}

/**
 * The bigint `format` (`int64`, `uint64` or `bigint`) a node's values have: its own, or the
 * one on the definition its `$ref` names, on an `allOf` member or on every non-null member
 * of a union, so a `default` beside a
 * `$ref` is written as the bigint the target holds. `holdsBigint` narrows which nodes count,
 * for a target that spells some of them (an `enum`) with numbers. A reference already being
 * read ends the search, as a cycle does.
 */
export function bigintFormatOf(
  schema: DefaultSchema,
  definitions: { readonly [name: string]: DefaultSchema } | undefined,
  holdsBigint: (node: DefaultSchema) => boolean = () => true,
) {
  const search = (node: DefaultSchema, reading: ReadonlySet<string>): string | undefined => {
    const { format } = node
    if ((format === 'int64' || format === 'uint64' || format === 'bigint') && holdsBigint(node)) {
      return format
    }
    if (node.$ref !== undefined && !reading.has(node.$ref)) {
      const target = definitionOf(node.$ref, definitions)
      const found =
        target === undefined ? undefined : search(target, new Set([...reading, node.$ref]))
      if (found !== undefined) return found
    }
    for (const member of node.allOf ?? []) {
      const found = search(member, reading)
      if (found !== undefined) return found
    }
    // A union is a bigint when every member but `null` is the same one: the nullable
    // `anyOf: [{ $ref }, { type: 'null' }]` of OpenAPI 3.1.
    const members = (node.anyOf ?? node.oneOf ?? []).filter((member) => member.type !== 'null')
    const [first, ...rest] = members.map((member) => search(member, reading))
    return first !== undefined && rest.every((found) => found === first) ? first : undefined
  }
  return search(schema, new Set())
}
