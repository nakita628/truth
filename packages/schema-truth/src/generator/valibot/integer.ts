import { INTEGER_TEXT_PATTERN } from '../../constants/index.js'
import { regexSource } from '../../helper/format.js'
import { integerWirePattern } from '../../helper/wire.js'
import type { JSONSchema } from '../../parser/index.js'
import { valibotError } from '../../utils/index.js'
import { numberActions, rangeActions } from './number.js'

/** Whether a node is a 64-bit integer: a value beyond 2^53 that is read as a bigint. */
export function isInt64(schema: JSONSchema): boolean {
  return schema.format === 'int64' || schema.format === 'uint64'
}

/**
 * The pipe that reads a 64-bit integer into a bigint ahead of its checks. On the string
 * wire the text is a sign and digits; in a JSON body the value is a bigint, a safe-integer
 * number, or the string of digits that is the only lossless way to carry a larger one.
 */
export function int64Input(isWire: boolean, baseErrorArg = ''): readonly string[] {
  const digits = regexSource(INTEGER_TEXT_PATTERN)
  if (isWire) {
    return [
      `v.string(${baseErrorArg})`,
      `v.regex(${digits})`,
      'v.transform((input)=>BigInt(input))',
    ]
  }
  return [
    `v.union([v.bigint(),v.pipe(v.number(),v.integer()),v.pipe(v.string(),v.regex(${digits}))]${baseErrorArg ? `,${baseErrorArg}` : ''})`,
    'v.transform((input)=>BigInt(input))',
  ]
}

/**
 * The Valibot schema of an integer node. `int64` / `uint64` are bigints wherever they
 * come from, `bigint` is one too, `int32` / `uint32` carry their range, and on the
 * string wire the text has to match the integer grammar before `Number` reads it, and is
 * then checked a safe integer.
 */
export function integer(schema: JSONSchema, options?: { readonly wire?: boolean }) {
  const isWire = options?.wire === true
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const baseErrorArg = errorMessage
    ? valibotError(errorMessage)
    : requiredMessage
      ? valibotError(requiredMessage)
      : ''
  if (schema.format === 'bigint') {
    const actions = numberActions(schema, (n) => `BigInt(${n})`)
    const base = `v.bigint(${baseErrorArg})`
    const items = isWire
      ? [
          'v.string()',
          `v.regex(${regexSource(INTEGER_TEXT_PATTERN)})`,
          'v.transform((input)=>BigInt(input))',
          base,
        ]
      : [base]
    if (items.length === 1 && actions.length === 0) return errorMessage ? base : 'v.bigint()'
    return `v.pipe(${[...items, ...actions].join(',')})`
  }
  if (isInt64(schema)) {
    const actions = [...rangeActions(schema.format), ...numberActions(schema, (n) => `${n}n`)]
    return `v.pipe(${[...int64Input(isWire, baseErrorArg), ...actions].join(',')})`
  }
  const integerAction = isWire
    ? `v.safeInteger(${errorMessage ? baseErrorArg : ''})`
    : `v.integer(${errorMessage ? baseErrorArg : ''})`
  const actions = [integerAction, ...rangeActions(schema.format), ...numberActions(schema)]
  const regexError = baseErrorArg === '' ? '' : `,${baseErrorArg}`
  const input = isWire
    ? [
        'v.string()',
        `v.regex(${integerWirePattern()}${regexError})`,
        'v.transform((input)=>Number(input))',
      ]
    : []
  return `v.pipe(${[...input, `v.number(${baseErrorArg})`, ...actions].join(',')})`
}
