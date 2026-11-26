import { bigintBounds } from '../../helper/bigint.js'
import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'
import { fixedWidthBounds } from './number.js'

// `Type.BigInt` takes its bounds as numbers, which keeps the schema serializable where a
// bigint literal makes `JSON.stringify` throw. It carries no `default` (`typeboxDefaultOpt`):
// `Value.Default` would put a number in as written, which the check rejects, and a bigint
// literal would not serialize. `Value.Create` runs `BigInt()` on a lower bound and the check
// runs `BigInt(value) % BigInt(multipleOf)`, so both are made integers first (`bigintBounds`).
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
  const bigint = schema.format === 'bigint' ? bigintBounds(schema) : undefined
  // The options stay numbers, so a divisor a number cannot hold exactly is left out here,
  // and a `multipleOf` the bigint branch leaves out takes its message with it.
  const bigintMultipleOf = typeof bigint?.multipleOf === 'number' ? bigint.multipleOf : undefined
  const multipleOfMessage =
    bigint === undefined
      ? schema['x-multipleOf-message']
      : bigintMultipleOf === undefined
        ? undefined
        : bigint['x-multipleOf-message']
  // ajv-errors `errorMessage` accepts two shapes:
  //   - string  → used as a single message for any validation failure
  //   - object  → per-keyword messages keyed by JSON Schema keyword
  // When only `x-error-message` is set we emit the string form (the
  // common case). Per-keyword messages flip us into object form, with
  // `x-error-message` joining as the catch-all under the ajv-errors `_`
  // convention.
  // A fixed-width format holds the value to its range too, as every other target does. Where
  // its bound is the tighter one, it is the only bound on that side: TypeBox's `Value.Create`
  // reads an `exclusiveMinimum` ahead of `minimum`, and a keyword's message would report the
  // format's range, which falls to `x-error-message` as on the string wire.
  const formatBounds = fixedWidthBounds(schema, 'integer')
  const isLowerFromFormat = formatBounds.minimum !== undefined
  const isUpperFromFormat = formatBounds.maximum !== undefined
  const perKeywordEntries: string[] = []
  if (requiredMessage) perKeywordEntries.push(`required:${JSON.stringify(requiredMessage)}`)
  if (minMessage && minimumKeyword === 'minimum' && !isLowerFromFormat) {
    perKeywordEntries.push(`minimum:${JSON.stringify(minMessage)}`)
  }
  if (maxMessage && maximumKeyword === 'maximum' && !isUpperFromFormat) {
    perKeywordEntries.push(`maximum:${JSON.stringify(maxMessage)}`)
  }
  if (exclusiveMinimumMessage && !isLowerFromFormat) {
    perKeywordEntries.push(`exclusiveMinimum:${JSON.stringify(exclusiveMinimumMessage)}`)
  }
  if (exclusiveMaximumMessage && !isUpperFromFormat) {
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

  if (bigint !== undefined) {
    const opts = [
      ...typeboxRefOpt(ref),
      bigint.minimum !== undefined ? `${minimumKeyword}:${bigint.minimum}` : undefined,
      typeof bigint.exclusiveMinimum === 'number'
        ? `exclusiveMinimum:${bigint.exclusiveMinimum}`
        : undefined,
      bigint.maximum !== undefined ? `${maximumKeyword}:${bigint.maximum}` : undefined,
      typeof bigint.exclusiveMaximum === 'number'
        ? `exclusiveMaximum:${bigint.exclusiveMaximum}`
        : undefined,
      bigintMultipleOf === undefined ? undefined : `multipleOf:${BigInt(bigintMultipleOf)}`,
      errorMessageField,
      ...metaOpts,
    ].filter((v) => v !== undefined)

    if (opts.length > 0) return `Type.BigInt({${opts.join(',')}})`
    return 'Type.BigInt()'
  }

  const opts = [
    ...typeboxRefOpt(ref),
    ...(isLowerFromFormat
      ? [`minimum:${formatBounds.minimum}`]
      : [
          schema.minimum !== undefined ? `${minimumKeyword}:${schema.minimum}` : undefined,
          typeof schema.exclusiveMinimum === 'number'
            ? `exclusiveMinimum:${schema.exclusiveMinimum}`
            : undefined,
        ]),
    ...(isUpperFromFormat
      ? [`maximum:${formatBounds.maximum}`]
      : [
          schema.maximum !== undefined ? `${maximumKeyword}:${schema.maximum}` : undefined,
          typeof schema.exclusiveMaximum === 'number'
            ? `exclusiveMaximum:${schema.exclusiveMaximum}`
            : undefined,
        ]),
    schema.multipleOf !== undefined ? `multipleOf:${schema.multipleOf}` : undefined,
    errorMessageField,
    ...metaOpts,
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.Integer({${opts.join(',')}})`
  }
  return 'Type.Integer()'
}
