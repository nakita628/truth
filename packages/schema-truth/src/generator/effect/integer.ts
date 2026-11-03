import { INTEGER_TEXT_PATTERN, NUMBER_RANGES } from '../../constants/index.js'
import { regexSource } from '../../helper/format.js'
import type { JSONSchema } from '../../parser/index.js'
import { effectError } from '../../utils/index.js'
import { numberChecks, wireNumericInput } from './number.js'

/** Whether a node is a 64-bit integer: a value beyond 2^53 that is read as a bigint. */
export function isInt64(schema: JSONSchema): boolean {
  return schema.format === 'int64' || schema.format === 'uint64'
}

/**
 * The schema that reads a 64-bit integer into a bigint ahead of its checks. On the
 * string wire the text is a sign and digits; in a JSON body the value is a bigint, a
 * safe-integer number, or the string of digits that is the only lossless way to carry a
 * larger one.
 */
export function int64Input(isWire: boolean): string {
  if (isWire) return 'Schema.BigIntFromString'
  return `Schema.Union([Schema.BigInt,Schema.Number.check(Schema.isInt()),Schema.String.check(Schema.isPattern(${regexSource(INTEGER_TEXT_PATTERN)}))]).pipe(Schema.decodeTo(Schema.BigInt,SchemaTransformation.transform({decode:(input)=>BigInt(input),encode:(output)=>output})))`
}

/** The range check of `int64` / `uint64`, over bigints. */
function int64Range(format: string): string {
  const range = NUMBER_RANGES[format]
  if (range === undefined) return ''
  return `Schema.isBetweenBigInt({minimum:${range.minimum},maximum:${range.maximum}})`
}

/**
 * The Effect schema of an integer node. `int64` / `uint64` are bigints wherever they come
 * from, `bigint` is one too, `int32` / `uint32` are their own filters, and on the string
 * wire the text has to match the integer grammar before it is decoded to a finite number.
 */
export function integer(schema: JSONSchema, options?: { readonly wire?: boolean }) {
  const isWire = options?.wire === true
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const annotate = (base: string): string =>
    errorMessage ? `${base}.annotate(${effectError(errorMessage)})` : base
  if (schema.format === 'bigint' || isInt64(schema)) {
    const lit = (n: number) => (schema.format === 'bigint' ? `BigInt(${n})` : `${n}n`)
    const checks = [
      ...(schema.format === 'bigint' ? [] : [int64Range(schema.format ?? '')]),
      ...numberChecks(schema, lit, 'BigInt'),
    ].filter((check) => check !== '')
    const input =
      schema.format === 'bigint'
        ? isWire
          ? 'Schema.BigIntFromString'
          : 'Schema.BigInt'
        : int64Input(isWire)
    return annotate(checks.length > 0 ? `${input}.check(${checks.join(',')})` : input)
  }
  const intCheck =
    schema.format === 'int32' || schema.format === 'uint32'
      ? `Schema.${schema.format === 'uint32' ? 'isUint32' : 'isInt32'}(${errorMessage ? effectError(errorMessage) : ''})`
      : errorMessage
        ? `Schema.isInt(${effectError(errorMessage)})`
        : 'Schema.isInt()'
  const checks = [intCheck, ...numberChecks(schema)]
  const input = isWire ? wireNumericInput('integer') : 'Schema.Number'
  return `${input}.check(${checks.join(',')})`
}
