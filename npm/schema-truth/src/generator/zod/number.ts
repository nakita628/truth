import { integerWirePattern, numberWirePattern } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { zodBaseError, zodError } from '../../utils/index.js'

/**
 * Wire text that matches the integer or JSON number grammar, read with `Number` ahead of
 * `inner`; any other value reaches `inner` as it is and fails its type check.
 * `z.coerce.number()` uses `Number` on its own, which accepts `""`, `" "` and `"0x10"`.
 * A `z.preprocess` and not a `z.string()` pipe, because `z.toJSONSchema` documents a pipe
 * by its input and a preprocess by `inner`: the parameter stays the spec's number.
 */
export function zodWireNumber(kind: 'integer' | 'number', inner: string) {
  const pattern = kind === 'integer' ? integerWirePattern() : numberWirePattern()
  return `z.preprocess((val)=>typeof val==='string'&&${pattern}.test(val)?Number(val):val,${inner})`
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
  if (isWire) return zodWireNumber('number', innerChain)
  if (isCoerce && (isFloat32 || isFloat64)) {
    return `z.coerce.number(${baseErrorArg}).pipe(${innerChain})`
  }
  return innerChain
}
