import { NUMBER_RANGES } from '../../constants/index.js'
import type { BigintSchema } from '../../helper/bigint.js'
import { examplesOf, numberWirePattern, serializeJSValue } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { valibotError, valibotErrorPart } from '../../utils/index.js'

/** The `v.minValue` / `v.maxValue` / `v.gtValue` / `v.ltValue` / `v.multipleOf` actions of a numeric node. */
export function numberActions(
  schema: BigintSchema,
  lit: (n: number | bigint) => string = (n) => `${n}`,
) {
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
    return undefined
  })()
  // A 2020-12 numeric `exclusiveMinimum` is a bound of its own, checked beside `minimum`.
  const exclusiveMinimum =
    typeof schema.exclusiveMinimum === 'number'
      ? `v.gtValue(${lit(schema.exclusiveMinimum)}${exMinErrorPart})`
      : undefined
  const maximum = (() => {
    if (schema.maximum !== undefined) {
      return schema.exclusiveMaximum === true
        ? `v.ltValue(${lit(schema.maximum)}${exMaxErrorPart})`
        : `v.maxValue(${lit(schema.maximum)}${maxErrorPart})`
    }
    return undefined
  })()
  // A 2020-12 numeric `exclusiveMaximum` is a bound of its own, checked beside `maximum`.
  const exclusiveMaximum =
    typeof schema.exclusiveMaximum === 'number'
      ? `v.ltValue(${lit(schema.exclusiveMaximum)}${exMaxErrorPart})`
      : undefined
  const multipleOf =
    schema.multipleOf !== undefined
      ? `v.multipleOf(${lit(schema.multipleOf)}${multipleOfErrorPart})`
      : undefined
  return [minimum, exclusiveMinimum, maximum, exclusiveMaximum, multipleOf].filter(
    (v) => v !== undefined,
  )
}

/** The `v.minValue` / `v.maxValue` pair of a fixed-width numeric `format`, if it has one. */
export function rangeActions(format: string | undefined) {
  const range = format === undefined ? undefined : NUMBER_RANGES[format]
  if (range === undefined) return []
  return [`v.minValue(${range.minimum})`, `v.maxValue(${range.maximum})`]
}

/**
 * The `v.metadata` that documents wire text as the number it is read into. A JSON Schema
 * converter that describes the input side (`@valibot/to-json-schema` with
 * `typeMode: 'input'`) stops at the pipe's `v.transform`, so without it the parameter is a
 * `string` with a `pattern`; the metadata gives it the spec's `type` and bounds back. An
 * exclusive bound is the number draft-07 and 2020-12 write, the converter's default target;
 * OpenAPI 3.0's boolean form is not followed.
 */
export function wireNumberMetadata(
  kind: 'integer' | 'number',
  schema: JSONSchema,
  values?: readonly unknown[],
) {
  const isExclusiveMinimum = schema.exclusiveMinimum === true
  const isExclusiveMaximum = schema.exclusiveMaximum === true
  const exclusiveMinimum = isExclusiveMinimum ? schema.minimum : schema.exclusiveMinimum
  const exclusiveMaximum = isExclusiveMaximum ? schema.maximum : schema.exclusiveMaximum
  // The range of a fixed-width `format` is a bound the pipe checks as well, so the tighter
  // of it and the spec's own inclusive bound is the one documented.
  const isFloat32 = schema.format === 'float' || schema.format === 'float32'
  const range =
    kind === 'number'
      ? isFloat32
        ? NUMBER_RANGES.float32
        : undefined
      : schema.format === 'int32' || schema.format === 'uint32'
        ? NUMBER_RANGES[schema.format]
        : undefined
  const minimums = [
    ...(schema.minimum !== undefined && !isExclusiveMinimum ? [schema.minimum] : []),
    ...(range === undefined ? [] : [Number(range.minimum)]),
  ]
  const maximums = [
    ...(schema.maximum !== undefined && !isExclusiveMaximum ? [schema.maximum] : []),
    ...(range === undefined ? [] : [Number(range.maximum)]),
  ]
  const examples = examplesOf(schema)
  const entries = [
    `type:'${kind}'`,
    ...(typeof schema.format === 'string' ? [`format:${JSON.stringify(schema.format)}`] : []),
    ...(values === undefined ? [] : [`enum:${JSON.stringify(values)}`]),
    ...(minimums.length > 0 ? [`minimum:${Math.max(...minimums)}`] : []),
    ...(typeof exclusiveMinimum === 'number' ? [`exclusiveMinimum:${exclusiveMinimum}`] : []),
    ...(maximums.length > 0 ? [`maximum:${Math.min(...maximums)}`] : []),
    ...(typeof exclusiveMaximum === 'number' ? [`exclusiveMaximum:${exclusiveMaximum}`] : []),
    ...(schema.multipleOf !== undefined ? [`multipleOf:${schema.multipleOf}`] : []),
    // The pipe's own `v.description` / `v.metadata` come after the transform, where the
    // converter no longer reads, so they are documented here too.
    ...(schema.description === undefined
      ? []
      : [`description:${JSON.stringify(schema.description)}`]),
    ...(examples === undefined ? [] : [`examples:${serializeJSValue(examples)}`]),
    ...(schema.deprecated === undefined ? [] : [`deprecated:${schema.deprecated}`]),
  ]
  return `v.metadata({${entries.join(',')}})`
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
    return `v.pipe(v.string(),v.regex(${numberWirePattern()}${regexError}),${wireNumberMetadata('number', schema)},v.transform((input)=>Number(input)),${base},${actions.join(',')})`
  }
  if (actions.length > 0) return `v.pipe(${base},${actions.join(',')})`
  return errorMessage ? base : 'v.number()'
}
