import { NUMBER_RANGES } from '../../constants/index.js'
import { numberWirePattern } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { valibotError, valibotErrorPart } from '../../utils/index.js'

/** The `v.minValue` / `v.maxValue` / `v.gtValue` / `v.ltValue` / `v.multipleOf` actions of a numeric node. */
export function numberActions(
  schema: JSONSchema,
  lit: (n: number) => string = (n) => `${n}`,
): readonly string[] {
  const minimumMessage = schema['x-minimum-message']
  const minErrorPart = valibotErrorPart(minimumMessage)
  const maximumMessage = schema['x-maximum-message']
  const maxErrorPart = valibotErrorPart(maximumMessage)
  // v3.0: x-exclusiveMin/Max-message for valibot's gtValue / ltValue
  const exMinMessage = schema['x-exclusiveMinimum-message']
  const exMinErrorPart = valibotErrorPart(exMinMessage)
  const exMaxMessage = schema['x-exclusiveMaximum-message']
  const exMaxErrorPart = valibotErrorPart(exMaxMessage)
  const multipleOfMessage = schema['x-multipleOf-message']
  const multipleOfErrorPart = valibotErrorPart(multipleOfMessage)
  const minimum = (() => {
    if (schema.minimum !== undefined) {
      return schema.exclusiveMinimum === true
        ? `v.gtValue(${lit(schema.minimum)}${exMinErrorPart})`
        : `v.minValue(${lit(schema.minimum)}${minErrorPart})`
    }
    if (typeof schema.exclusiveMinimum === 'number') {
      return `v.gtValue(${lit(schema.exclusiveMinimum)}${exMinErrorPart})`
    }
    return undefined
  })()
  const maximum = (() => {
    if (schema.maximum !== undefined) {
      return schema.exclusiveMaximum === true
        ? `v.ltValue(${lit(schema.maximum)}${exMaxErrorPart})`
        : `v.maxValue(${lit(schema.maximum)}${maxErrorPart})`
    }
    if (typeof schema.exclusiveMaximum === 'number') {
      return `v.ltValue(${lit(schema.exclusiveMaximum)}${exMaxErrorPart})`
    }
    return undefined
  })()
  const multipleOf =
    schema.multipleOf !== undefined
      ? `v.multipleOf(${lit(schema.multipleOf)}${multipleOfErrorPart})`
      : undefined
  return [minimum, maximum, multipleOf].filter((v) => v !== undefined)
}

/** The `v.minValue` / `v.maxValue` pair of a fixed-width numeric `format`, if it has one. */
export function rangeActions(format: string | undefined): readonly string[] {
  const range = format === undefined ? undefined : NUMBER_RANGES[format]
  if (range === undefined) return []
  return [`v.minValue(${range.minimum})`, `v.maxValue(${range.maximum})`]
}

/**
 * The Valibot schema of a number node. On the string wire the text has to match the JSON
 * number grammar before `Number` reads it, then it is checked finite; `float` / `float32`
 * carries its range.
 */
export function number(schema: JSONSchema, options?: { readonly wire?: boolean }) {
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const baseErrorArg = errorMessage
    ? valibotError(errorMessage)
    : requiredMessage
      ? valibotError(requiredMessage)
      : ''
  const isFloat32 = schema.format === 'float' || schema.format === 'float32'
  const actions = [
    ...(options?.wire === true ? ['v.finite()'] : []),
    ...rangeActions(isFloat32 ? 'float32' : undefined),
    ...numberActions(schema),
  ]
  const base = `v.number(${baseErrorArg})`
  if (options?.wire === true) {
    const regexError = baseErrorArg === '' ? '' : `,${baseErrorArg}`
    return `v.pipe(v.string(),v.regex(${numberWirePattern()}${regexError}),v.transform((input)=>Number(input)),${base},${actions.join(',')})`
  }
  if (actions.length > 0) return `v.pipe(${base},${actions.join(',')})`
  return errorMessage ? base : 'v.number()'
}
