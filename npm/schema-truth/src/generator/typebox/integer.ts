import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

// `Type.BigInt` takes its bounds as numbers: TypeBox compares a bigint with a number
// bound directly, so a fractional bound needs no rounding, and the schema stays
// serializable, where a bigint literal makes `JSON.stringify` throw. A non-finite bound
// (a YAML `.inf`) is left out; `sanitizeSchema` drops it before the generator anyway.
function bigintBound(keyword: string, value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? `${keyword}:${value}` : undefined
}

// TypeBox checks a bigint with `BigInt(value) % BigInt(multipleOf)`, so the divisor has
// to be a positive integer. A bigint `x` is a multiple of `p / q` (in lowest terms)
// exactly when it is a multiple of `p`, so a fraction reduces to its numerator: 2.5 is
// 5/2 and becomes `5`. The fraction is read from the number's shortest decimal spelling.
// Zero, a negative or a non-finite divisor has no such integer and is left out.
function bigintDivisor(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(value))
  if (!match) return undefined
  const [, whole, fraction = '', exponent = '0'] = match
  const numerator = BigInt(whole + fraction)
  const scale = Number(exponent) - fraction.length
  if (scale >= 0) return numerator * 10n ** BigInt(scale)
  const denominator = 10n ** BigInt(-scale)
  let [a, b] = [numerator, denominator]
  while (b !== 0n) [a, b] = [b, a % b]
  return numerator / a
}

export function integer(schema: JSONSchema, ref?: string) {
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const minMessage = schema['x-minimum-message']
  const maxMessage = schema['x-maximum-message']
  const exclusiveMinimumMessage = schema['x-exclusiveMinimum-message']
  const exclusiveMaximumMessage = schema['x-exclusiveMaximum-message']
  // Draft-04 spells an exclusive bound as `minimum` plus a boolean `exclusiveMinimum`.
  // TypeBox reads the numeric keyword only, so the bound moves under it; its message is
  // the exclusive keyword's, as in every other target.
  const minimumKeyword =
    schema.exclusiveMinimum === true && schema.minimum !== undefined
      ? 'exclusiveMinimum'
      : 'minimum'
  const maximumKeyword =
    schema.exclusiveMaximum === true && schema.maximum !== undefined
      ? 'exclusiveMaximum'
      : 'maximum'
  const bigintMultipleOf = schema.format === 'bigint' ? bigintDivisor(schema.multipleOf) : undefined
  // A `multipleOf` the bigint branch leaves out takes its message with it.
  const multipleOfMessage =
    schema.format === 'bigint' && bigintMultipleOf === undefined
      ? undefined
      : schema['x-multipleOf-message']
  // ajv-errors `errorMessage` accepts two shapes:
  //   - string  → used as a single message for any validation failure
  //   - object  → per-keyword messages keyed by JSON Schema keyword
  // When only `x-error-message` is set we emit the string form (the
  // common case). Per-keyword messages flip us into object form, with
  // `x-error-message` joining as the catch-all under the ajv-errors `_`
  // convention.
  const perKeywordEntries: string[] = []
  if (requiredMessage) perKeywordEntries.push(`required:${JSON.stringify(requiredMessage)}`)
  if (minMessage && minimumKeyword === 'minimum') {
    perKeywordEntries.push(`minimum:${JSON.stringify(minMessage)}`)
  }
  if (maxMessage && maximumKeyword === 'maximum') {
    perKeywordEntries.push(`maximum:${JSON.stringify(maxMessage)}`)
  }
  if (exclusiveMinimumMessage) {
    perKeywordEntries.push(`exclusiveMinimum:${JSON.stringify(exclusiveMinimumMessage)}`)
  }
  if (exclusiveMaximumMessage) {
    perKeywordEntries.push(`exclusiveMaximum:${JSON.stringify(exclusiveMaximumMessage)}`)
  }
  if (multipleOfMessage) perKeywordEntries.push(`multipleOf:${JSON.stringify(multipleOfMessage)}`)
  const errorMessageField =
    perKeywordEntries.length === 0
      ? errorMessage
        ? `errorMessage:${JSON.stringify(errorMessage)}`
        : undefined
      : `errorMessage:{${perKeywordEntries.join(',')}${
          errorMessage ? `,_:${JSON.stringify(errorMessage)}` : ''
        }}`
  const metaOpts = [...typeboxMetaOpts(schema), ...typeboxDefaultOpt(schema)]

  if (schema.format === 'bigint') {
    const opts = [
      ...typeboxRefOpt(ref),
      bigintBound(minimumKeyword, schema.minimum),
      bigintBound('exclusiveMinimum', schema.exclusiveMinimum),
      bigintBound(maximumKeyword, schema.maximum),
      bigintBound('exclusiveMaximum', schema.exclusiveMaximum),
      bigintMultipleOf !== undefined ? `multipleOf:${bigintMultipleOf}` : undefined,
      errorMessageField,
      ...metaOpts,
    ].filter((v) => v !== undefined)

    if (opts.length > 0) return `Type.BigInt({${opts.join(',')}})`
    return 'Type.BigInt()'
  }

  const opts = [
    ...typeboxRefOpt(ref),
    schema.minimum !== undefined ? `${minimumKeyword}:${schema.minimum}` : undefined,
    typeof schema.exclusiveMinimum === 'number'
      ? `exclusiveMinimum:${schema.exclusiveMinimum}`
      : undefined,
    schema.maximum !== undefined ? `${maximumKeyword}:${schema.maximum}` : undefined,
    typeof schema.exclusiveMaximum === 'number'
      ? `exclusiveMaximum:${schema.exclusiveMaximum}`
      : undefined,
    schema.multipleOf !== undefined ? `multipleOf:${schema.multipleOf}` : undefined,
    errorMessageField,
    ...metaOpts,
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.Integer({${opts.join(',')}})`
  }
  return 'Type.Integer()'
}
