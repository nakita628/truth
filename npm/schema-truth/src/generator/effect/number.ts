import { NUMBER_RANGES } from '../../constants/index.js'
import { integerWirePattern, numberWirePattern } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { effectError, effectErrorPart } from '../../utils/index.js'

/** The bound and `multipleOf` checks of a numeric node. */
export function numberChecks(
  schema: JSONSchema,
  lit: (n: number) => string = (n) => `${n}`,
  suffix = '',
): readonly string[] {
  const minimumMessage = schema['x-minimum-message']
  const minErrorPart = effectErrorPart(minimumMessage)
  const maximumMessage = schema['x-maximum-message']
  const maxErrorPart = effectErrorPart(maximumMessage)
  // v3.0: exclusive bounds get their own message (isGreaterThan / isLessThan)
  const exMinMessage = schema['x-exclusiveMinimum-message']
  const exMinErrorPart = effectErrorPart(exMinMessage)
  const exMaxMessage = schema['x-exclusiveMaximum-message']
  const exMaxErrorPart = effectErrorPart(exMaxMessage)
  const multipleOfMessage = schema['x-multipleOf-message']
  const multipleOfErrorPart = effectErrorPart(multipleOfMessage)
  const minimum = (() => {
    if (schema.minimum !== undefined) {
      return schema.exclusiveMinimum === true
        ? `Schema.isGreaterThan${suffix}(${lit(schema.minimum)}${exMinErrorPart})`
        : `Schema.isGreaterThanOrEqualTo${suffix}(${lit(schema.minimum)}${minErrorPart})`
    }
    if (typeof schema.exclusiveMinimum === 'number') {
      return `Schema.isGreaterThan${suffix}(${lit(schema.exclusiveMinimum)}${exMinErrorPart})`
    }
    return undefined
  })()
  const maximum = (() => {
    if (schema.maximum !== undefined) {
      return schema.exclusiveMaximum === true
        ? `Schema.isLessThan${suffix}(${lit(schema.maximum)}${exMaxErrorPart})`
        : `Schema.isLessThanOrEqualTo${suffix}(${lit(schema.maximum)}${maxErrorPart})`
    }
    if (typeof schema.exclusiveMaximum === 'number') {
      return `Schema.isLessThan${suffix}(${lit(schema.exclusiveMaximum)}${exMaxErrorPart})`
    }
    return undefined
  })()
  // v4 has no `isMultipleOfBigInt`, so a bigint's `multipleOf` is a filter of its own.
  const multipleOf =
    schema.multipleOf === undefined
      ? undefined
      : suffix === 'BigInt'
        ? `Schema.makeFilter((input)=>input%${lit(schema.multipleOf)}===0n${multipleOfErrorPart})`
        : `Schema.isMultipleOf(${lit(schema.multipleOf)}${multipleOfErrorPart})`
  return [minimum, maximum, multipleOf].filter((v) => v !== undefined)
}

/** The range check of a fixed-width numeric `format` that has one and no filter of its own. */
export function rangeCheck(format: string | undefined, suffix = ''): readonly string[] {
  const range = format === undefined ? undefined : NUMBER_RANGES[format]
  if (range === undefined) return []
  return [`Schema.isBetween${suffix}({minimum:${range.minimum},maximum:${range.maximum}})`]
}

/**
 * Wire text checked against the integer or JSON number grammar, then decoded to a finite
 * number. `Schema.FiniteFromString` uses `Number`, which accepts `""`, `" "` and `"0x10"`.
 */
export function wireNumericInput(kind: 'integer' | 'number'): string {
  const pattern = kind === 'integer' ? integerWirePattern() : numberWirePattern()
  return `Schema.String.check(Schema.isPattern(${pattern})).pipe(Schema.decodeTo(Schema.Finite,SchemaTransformation.transform({decode:(input)=>Number(input),encode:(output)=>String(output)})))`
}

/**
 * The Effect schema of a number node. On the string wire the text has to match the JSON
 * number grammar before it is decoded to a finite number; `float` / `float32` carries
 * its range.
 */
export function number(schema: JSONSchema, options?: { readonly wire?: boolean }) {
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const isFloat32 = schema.format === 'float' || schema.format === 'float32'
  const checks = [...rangeCheck(isFloat32 ? 'float32' : undefined), ...numberChecks(schema)]
  const input = options?.wire === true ? wireNumericInput('number') : 'Schema.Number'
  const base = checks.length > 0 ? `${input}.check(${checks.join(',')})` : input
  return errorMessage ? `${base}.annotate(${effectError(errorMessage)})` : base
}
