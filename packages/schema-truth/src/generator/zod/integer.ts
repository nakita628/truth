import type { JSONSchema } from '../../parser/index.js'
import { zodBaseError, zodError, zodErrorPart } from '../../utils/index.js'
import { zodWireNumber } from './number.js'

/** Whether a node is a 64-bit integer: a value beyond 2^53 that Zod reads as a bigint. */
export function isInt64(schema: JSONSchema): boolean {
  return schema.format === 'int64' || schema.format === 'uint64'
}

/**
 * What reads a 64-bit integer into a bigint ahead of the check. On the string wire the text
 * is coerced; in a JSON body the value is a safe-integer number, or the string of digits
 * that is the only lossless way to carry a larger one, and nothing else.
 */
export function int64Input(isWire: boolean, baseErrorArg = ''): string {
  if (isWire) return `z.coerce.bigint(${baseErrorArg})`
  const errorPart = baseErrorArg ? `,${baseErrorArg}` : ''
  return String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]${errorPart}).transform((val)=>BigInt(val))`
}

/**
 * Generates a Zod schema for integer types (int / int32 / uint32 / int64 / bigint), with
 * min/max/multipleOf constraints and `x-*-message` vendor extensions translated
 * to Zod v4 `{error: "msg"}` parameters.
 */
export function integer(schema: JSONSchema, options?: { readonly wire?: boolean }) {
  const isWire = options?.wire === true
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const isCoerce = schema['x-coerce'] === true && !isWire
  const readsText = isCoerce || isWire
  // Coercion converts undefined → NaN/BigInt error before the error handler runs,
  // so issue.input === undefined is unreachable — drop x-required-message.
  const baseErrorArg = zodBaseError(errorMessage, readsText ? undefined : requiredMessage)
  const isBigint = schema.format === 'bigint'
  const isInt32 = schema.format === 'int32' || schema.format === 'uint32'
  const is64 = isInt64(schema)
  const bigintBase = readsText && isBigint
  const numberPipe = isCoerce && isInt32
  const numberChain = isCoerce && !isBigint && !is64 && !isInt32
  const base = bigintBase
    ? `z.coerce.bigint(${baseErrorArg})`
    : isInt32
      ? `z.${schema.format === 'uint32' ? 'uint32' : 'int32'}(${baseErrorArg})`
      : is64
        ? `z.${schema.format === 'uint64' ? 'uint64' : 'int64'}(${baseErrorArg})`
        : isBigint
          ? `z.bigint(${baseErrorArg})`
          : `z.int(${baseErrorArg})`
  const lit = (n: number): string => {
    if (schema.format === 'bigint') return `BigInt(${n})`
    if (is64) return `${n}n`
    return `${n}`
  }
  const minimumMessage = schema['x-minimum-message'] ?? errorMessage
  const exclusiveMinMessage = schema['x-exclusiveMinimum-message'] ?? errorMessage
  const minErrorArg = minimumMessage ? zodError(minimumMessage) : ''
  const minErrorPart = minErrorArg ? `,${minErrorArg}` : ''
  const exMinErrorArg = exclusiveMinMessage ? zodError(exclusiveMinMessage) : ''
  const exMinErrorPart = exMinErrorArg ? `,${exMinErrorArg}` : ''
  const minimum = (() => {
    if (schema.minimum === undefined && schema.exclusiveMinimum === undefined) {
      return undefined
    }
    const value = schema.minimum ?? schema.exclusiveMinimum
    if (value === 0 && schema.exclusiveMinimum === true) {
      return `.positive(${exMinErrorArg})`
    }
    if (value === 0 && schema.exclusiveMinimum === false) {
      return `.nonnegative(${minErrorArg})`
    }
    if (
      (schema.exclusiveMinimum === true || schema.minimum === undefined) &&
      typeof value === 'number'
    ) {
      return `.gt(${lit(value)}${exMinErrorPart})`
    }
    if (typeof schema.minimum === 'number') {
      return `.min(${lit(schema.minimum)}${minErrorPart})`
    }
    return undefined
  })()
  const maximumMessage = schema['x-maximum-message'] ?? errorMessage
  const exclusiveMaxMessage = schema['x-exclusiveMaximum-message'] ?? errorMessage
  const maxErrorArg = maximumMessage ? zodError(maximumMessage) : ''
  const maxErrorPart = maxErrorArg ? `,${maxErrorArg}` : ''
  const exMaxErrorArg = exclusiveMaxMessage ? zodError(exclusiveMaxMessage) : ''
  const exMaxErrorPart = exMaxErrorArg ? `,${exMaxErrorArg}` : ''
  const maximum = (() => {
    if (schema.maximum === undefined && schema.exclusiveMaximum === undefined) {
      return undefined
    }
    const value = schema.maximum ?? schema.exclusiveMaximum
    if (value === 0 && schema.exclusiveMaximum === true) {
      return `.negative(${exMaxErrorArg})`
    }
    if (value === 0 && schema.exclusiveMaximum === false) {
      return `.nonpositive(${maxErrorArg})`
    }
    if (
      (schema.exclusiveMaximum === true || schema.maximum === undefined) &&
      typeof value === 'number'
    ) {
      return `.lt(${lit(value)}${exMaxErrorPart})`
    }
    if (typeof schema.maximum === 'number') {
      return `.max(${lit(schema.maximum)}${maxErrorPart})`
    }
    return undefined
  })()
  const multipleOfMessage = schema['x-multipleOf-message'] ?? errorMessage
  const multipleOfErrorArg = zodErrorPart(multipleOfMessage)
  const multipleOf =
    typeof schema.multipleOf === 'number'
      ? `.multipleOf(${lit(schema.multipleOf)}${multipleOfErrorArg})`
      : undefined
  const constraints = [minimum, maximum, multipleOf].filter((v) => v !== undefined).join('')
  const innerChain = [base, minimum, maximum, multipleOf].filter((v) => v !== undefined).join('')
  if (isWire && !isBigint && !is64) {
    const intErrorArg = errorMessage ? zodError(errorMessage) : ''
    const inner = isInt32
      ? innerChain
      : `z.number(${baseErrorArg}).int(${intErrorArg})${constraints}`
    return `${zodWireNumber('integer', baseErrorArg)}.pipe(${inner})`
  }
  if (numberChain) {
    const intErrorArg = errorMessage ? zodError(errorMessage) : ''
    return `z.coerce.number(${baseErrorArg}).int(${intErrorArg})${constraints}`
  }
  if (numberPipe) return `z.coerce.number(${baseErrorArg}).pipe(${innerChain})`
  if (is64) return `${int64Input(readsText, baseErrorArg)}.pipe(${innerChain})`
  return innerChain
}
