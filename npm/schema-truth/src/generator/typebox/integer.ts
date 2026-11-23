import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

// A bound of a bigint is written as a bigint literal. A fractional bound is rounded to
// the integer that admits the same bigints: an inclusive minimum and an exclusive maximum
// round up, an inclusive maximum and an exclusive minimum round down. `BigInt(n)` spells
// the digits out, where a template literal would write `1e+21`.
function bigintBound(value: number, round: 'ceil' | 'floor') {
  return `${BigInt(Math[round](value))}n`
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
  const multipleOfMessage = schema['x-multipleOf-message']
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
      schema.minimum !== undefined
        ? `${minimumKeyword}:${bigintBound(schema.minimum, minimumKeyword === 'minimum' ? 'ceil' : 'floor')}`
        : undefined,
      typeof schema.exclusiveMinimum === 'number'
        ? `exclusiveMinimum:${bigintBound(schema.exclusiveMinimum, 'floor')}`
        : undefined,
      schema.maximum !== undefined
        ? `${maximumKeyword}:${bigintBound(schema.maximum, maximumKeyword === 'maximum' ? 'floor' : 'ceil')}`
        : undefined,
      typeof schema.exclusiveMaximum === 'number'
        ? `exclusiveMaximum:${bigintBound(schema.exclusiveMaximum, 'ceil')}`
        : undefined,
      // TypeBox checks a bigint with `value % BigInt(multipleOf)`, which throws on a
      // fraction or zero, so only a positive integer divisor is emitted.
      schema.multipleOf !== undefined &&
      Number.isInteger(schema.multipleOf) &&
      schema.multipleOf > 0
        ? `multipleOf:${bigintBound(schema.multipleOf, 'floor')}`
        : undefined,
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
