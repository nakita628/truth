import { integerWirePattern, numberWirePattern } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { zodBaseError, zodError } from '../../utils/index.js'

/**
 * Wire text checked against the integer or JSON number grammar, then read with `Number`.
 * `z.coerce.number()` uses `Number` on its own, which accepts `""`, `" "` and `"0x10"`.
 */
export function zodWireNumber(kind: 'integer' | 'number', errorArg = ''): string {
  const pattern = kind === 'integer' ? integerWirePattern() : numberWirePattern()
  const errorPart = errorArg === '' ? '' : `,${errorArg}`
  return `z.string().regex(${pattern}${errorPart}).transform((val)=>Number(val))`
}

/**
 * Generates a Zod schema for number types (number / float32 / float64), with
 * min/max/multipleOf constraints and `x-*-message` vendor extensions translated
 * to Zod v4 `{error: "msg"}` parameters.
 */
export function number(schema: JSONSchema, options?: { readonly wire?: boolean }) {
  const isWire = options?.wire === true
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const isCoerce = schema['x-coerce'] === true && !isWire
  // Coercion converts undefined → NaN before the error handler runs, and wire text is
  // never undefined once it reaches the grammar, so drop x-required-message.
  const baseErrorArg = zodBaseError(errorMessage, isCoerce || isWire ? undefined : requiredMessage)
  const isFloat32 = schema.format === 'float' || schema.format === 'float32'
  const isFloat64 = schema.format === 'float64'
  const base = isFloat32
    ? `z.float32(${baseErrorArg})`
    : isFloat64
      ? `z.float64(${baseErrorArg})`
      : isCoerce
        ? `z.coerce.number(${baseErrorArg})`
        : `z.number(${baseErrorArg})`
  // v3.0: separate inclusive (.min()) / exclusive (.gt() / .positive()) slots
  const minimumMessage = schema['x-minimum-message']
  const exclusiveMinMessage = schema['x-exclusiveMinimum-message']
  const minErrorArg = minimumMessage ? zodError(minimumMessage) : ''
  const minErrorPart = minErrorArg ? `,${minErrorArg}` : ''
  const exMinErrorArg = exclusiveMinMessage ? zodError(exclusiveMinMessage) : ''
  const exMinErrorPart = exMinErrorArg ? `,${exMinErrorArg}` : ''
  const minimum = (() => {
    if (schema.minimum !== undefined) {
      if (schema.minimum === 0 && schema.exclusiveMinimum === true) {
        return `.positive(${exMinErrorArg})`
      }
      if (schema.minimum === 0 && schema.exclusiveMinimum === false) {
        return `.nonnegative(${minErrorArg})`
      }
      if (schema.exclusiveMinimum === true) {
        return `.gt(${schema.minimum}${exMinErrorPart})`
      }
      return `.min(${schema.minimum}${minErrorPart})`
    }
    if (typeof schema.exclusiveMinimum === 'number') {
      return `.gt(${schema.exclusiveMinimum}${exMinErrorPart})`
    }
    return undefined
  })()
  const maximumMessage = schema['x-maximum-message']
  const exclusiveMaxMessage = schema['x-exclusiveMaximum-message']
  const maxErrorArg = maximumMessage ? zodError(maximumMessage) : ''
  const maxErrorPart = maxErrorArg ? `,${maxErrorArg}` : ''
  const exMaxErrorArg = exclusiveMaxMessage ? zodError(exclusiveMaxMessage) : ''
  const exMaxErrorPart = exMaxErrorArg ? `,${exMaxErrorArg}` : ''
  const maximum = (() => {
    if (schema.maximum !== undefined) {
      if (schema.maximum === 0 && schema.exclusiveMaximum === true) {
        return `.negative(${exMaxErrorArg})`
      }
      if (schema.maximum === 0 && schema.exclusiveMaximum === false) {
        return `.nonpositive(${maxErrorArg})`
      }
      if (schema.exclusiveMaximum === true) {
        return `.lt(${schema.maximum}${exMaxErrorPart})`
      }
      return `.max(${schema.maximum}${maxErrorPart})`
    }
    if (typeof schema.exclusiveMaximum === 'number') {
      return `.lt(${schema.exclusiveMaximum}${exMaxErrorPart})`
    }
    return undefined
  })()
  const multipleOfMessage = schema['x-multipleOf-message']
  const multipleOfErrorArg = multipleOfMessage
    ? `,${zodError(multipleOfMessage)}`
    : baseErrorArg
      ? `,${baseErrorArg}`
      : ''
  const multipleOf =
    schema.multipleOf !== undefined
      ? `.multipleOf(${schema.multipleOf}${multipleOfErrorArg})`
      : undefined
  const innerChain = [base, minimum, maximum, multipleOf].filter((v) => v !== undefined).join('')
  if (isWire) return `${zodWireNumber('number', baseErrorArg)}.pipe(${innerChain})`
  if (isCoerce && (isFloat32 || isFloat64)) {
    return `z.coerce.number(${baseErrorArg}).pipe(${innerChain})`
  }
  return innerChain
}
