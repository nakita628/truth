import type { JSONSchema } from '../parser/index.js'

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
 * The positive integer divisor a bigint `multipleOf` check can use. A bigint `x` is a
 * multiple of `p / q` (in lowest terms) exactly when it is a multiple of `p`, so a
 * fraction reduces to its numerator: 2.5 is 5/2 and becomes `5`. The fraction is read
 * from the number's shortest decimal spelling. Zero, a negative or a non-finite divisor
 * has no such integer and is left out (a bigint `% 0n` throws), and so is a divisor a
 * number literal cannot hold exactly (above 2^53), since it would round to a different one.
 */
export function bigintDivisor(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(value))
  if (!match) return undefined
  const [, whole, fraction = '', exponent = '0'] = match
  const numerator = BigInt(whole + fraction)
  const scale = Number(exponent) - fraction.length
  const divisor = (() => {
    if (scale >= 0) return numerator * 10n ** BigInt(scale)
    let [a, b] = [numerator, 10n ** BigInt(-scale)]
    while (b !== 0n) [a, b] = [b, a % b]
    return numerator / a
  })()
  return BigInt(Number(divisor)) === divisor ? Number(divisor) : undefined
}

/**
 * The schema with its bounds and `multipleOf` made integers a bigint check can take: see
 * {@link bigintBound} and {@link bigintDivisor}. A bound or divisor that has no such
 * integer is left out, together with the draft-04 boolean or the message that belongs to it.
 */
export function bigintBounds(schema: JSONSchema): JSONSchema {
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
