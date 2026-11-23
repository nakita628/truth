import { bigintBounds, bigintCall, bigintLiteral } from '../../helper/bigint.js'
import type { JSONSchema } from '../../parser/index.js'
import { zodBaseError, zodError, zodErrorPart } from '../../utils/index.js'
import { joinChecks, zodWireNumber } from './number.js'

/** Whether a node is a 64-bit integer: a value beyond 2^53 that Zod reads as a bigint. */
export function isInt64(schema: JSONSchema) {
  return schema.format === 'int64' || schema.format === 'uint64'
}

/**
 * What reads a 64-bit integer into a bigint ahead of the check. On the string wire the text
 * is coerced; in a JSON body the value is a safe-integer number, or the string of digits
 * that is the only lossless way to carry a larger one, and nothing else.
 */
export function int64Input(isWire: boolean, baseErrorArg = '') {
  if (isWire) return `z.coerce.bigint(${baseErrorArg})`
  const errorPart = baseErrorArg ? `,${baseErrorArg}` : ''
  return String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]${errorPart}).transform((val)=>BigInt(val))`
}

/**
 * Generates a Zod schema for integer types (int / int32 / uint32 / int64 / bigint), with
 * min/max/multipleOf constraints and `x-*-message` vendor extensions translated
 * to Zod v4 `{error: "msg"}` parameters.
 */
export function integer(node: JSONSchema, options?: { readonly wire?: boolean }) {
  // A bigint check takes integer bounds and a positive integer divisor.
  const schema = node.format === 'bigint' || isInt64(node) ? bigintBounds(node) : node
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
  const is64 = isInt64(node)
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
  const lit = (n: number | bigint) => {
    if (isBigint) return bigintCall(n)
    if (is64) return bigintLiteral(n)
    return `${n}`
  }
  const minimumMessage = schema['x-minimum-message'] ?? errorMessage
  const exclusiveMinMessage = schema['x-exclusiveMinimum-message'] ?? errorMessage
  const minErrorArg = minimumMessage ? zodError(minimumMessage) : ''
  const minErrorPart = minErrorArg ? `,${minErrorArg}` : ''
  const exMinErrorArg = exclusiveMinMessage ? zodError(exclusiveMinMessage) : ''
  const exMinErrorPart = exMinErrorArg ? `,${exMinErrorArg}` : ''
  const inclusiveMinimum = (() => {
    if (typeof schema.minimum !== 'number') return undefined
    if (schema.minimum === 0 && schema.exclusiveMinimum === true) {
      return `.positive(${exMinErrorArg})`
    }
    if (schema.minimum === 0 && schema.exclusiveMinimum === false) {
      return `.nonnegative(${minErrorArg})`
    }
    if (schema.exclusiveMinimum === true) {
      return `.gt(${lit(schema.minimum)}${exMinErrorPart})`
    }
    return `.min(${lit(schema.minimum)}${minErrorPart})`
  })()
  // A 2020-12 numeric `exclusiveMinimum` is a bound of its own, checked beside `minimum`.
  const exclusiveMinimum =
    typeof schema.exclusiveMinimum === 'number'
      ? `.gt(${lit(schema.exclusiveMinimum)}${exMinErrorPart})`
      : undefined
  const minimum = joinChecks(inclusiveMinimum, exclusiveMinimum)
  const maximumMessage = schema['x-maximum-message'] ?? errorMessage
  const exclusiveMaxMessage = schema['x-exclusiveMaximum-message'] ?? errorMessage
  const maxErrorArg = maximumMessage ? zodError(maximumMessage) : ''
  const maxErrorPart = maxErrorArg ? `,${maxErrorArg}` : ''
  const exMaxErrorArg = exclusiveMaxMessage ? zodError(exclusiveMaxMessage) : ''
  const exMaxErrorPart = exMaxErrorArg ? `,${exMaxErrorArg}` : ''
  const inclusiveMaximum = (() => {
    if (typeof schema.maximum !== 'number') return undefined
    if (schema.maximum === 0 && schema.exclusiveMaximum === true) {
      return `.negative(${exMaxErrorArg})`
    }
    if (schema.maximum === 0 && schema.exclusiveMaximum === false) {
      return `.nonpositive(${maxErrorArg})`
    }
    if (schema.exclusiveMaximum === true) {
      return `.lt(${lit(schema.maximum)}${exMaxErrorPart})`
    }
    return `.max(${lit(schema.maximum)}${maxErrorPart})`
  })()
  // A 2020-12 numeric `exclusiveMaximum` is a bound of its own, checked beside `maximum`.
  const exclusiveMaximum =
    typeof schema.exclusiveMaximum === 'number'
      ? `.lt(${lit(schema.exclusiveMaximum)}${exMaxErrorPart})`
      : undefined
  const maximum = joinChecks(inclusiveMaximum, exclusiveMaximum)
  const multipleOfMessage = schema['x-multipleOf-message'] ?? errorMessage
  const multipleOfErrorArg = zodErrorPart(multipleOfMessage)
  const multipleOf =
    schema.multipleOf !== undefined
      ? `.multipleOf(${lit(schema.multipleOf)}${multipleOfErrorArg})`
      : undefined
  const constraints = [minimum, maximum, multipleOf].filter((v) => v !== undefined).join('')
  const innerChain = [base, minimum, maximum, multipleOf].filter((v) => v !== undefined).join('')
  if (isWire && !isBigint && !is64) {
    const intErrorArg = errorMessage ? zodError(errorMessage) : ''
    const inner = isInt32
      ? innerChain
      : `z.number(${baseErrorArg}).int(${intErrorArg})${constraints}`
    return zodWireNumber('integer', inner)
  }
  if (numberChain) {
    const intErrorArg = errorMessage ? zodError(errorMessage) : ''
    return `z.coerce.number(${baseErrorArg}).int(${intErrorArg})${constraints}`
  }
  if (numberPipe) return `z.coerce.number(${baseErrorArg}).pipe(${innerChain})`
  if (is64) return `${int64Input(readsText, baseErrorArg)}.pipe(${innerChain})`
  return innerChain
}
