import { NUMBER_RANGES } from '../../constants/index.js'
import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

export function number(schema: JSONSchema, ref?: string) {
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
  const multipleOfMessage = schema['x-multipleOf-message']
  // ajv-errors `errorMessage`: string for the common case (only
  // `x-error-message` set); object form when per-keyword messages are
  // present, with `x-error-message` joining as the catch-all under the
  // ajv-errors `_` convention. See typebox/integer.ts for the same pattern.
  const perKeywordEntries: string[] = []
  if (requiredMessage) perKeywordEntries.push(`required:${JSON.stringify(requiredMessage)}`)
  if (minMessage && minimumKeyword === 'minimum') {
    perKeywordEntries.push(`minimum:${JSON.stringify(minMessage)}`)
  }
  if (maxMessage && maximumKeyword === 'maximum') {
    perKeywordEntries.push(`maximum:${JSON.stringify(maxMessage)}`)
  }
  if (exclusiveMinimumMessage) {
    perKeywordEntries.push(`exclusiveMinimum:${JSON.stringify(exclusiveMinimumMessage)}`)
  }
  if (exclusiveMaximumMessage) {
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

  // A fixed-width format holds the value to its range too, as every other target does.
  const formatBounds = fixedWidthBounds(schema, 'number')
  const opts = [
    ...typeboxRefOpt(ref),
    schema.minimum !== undefined
      ? `${minimumKeyword}:${minimumKeyword === 'minimum' ? (formatBounds.minimum ?? schema.minimum) : schema.minimum}`
      : undefined,
    formatBounds.minimum !== undefined &&
    (schema.minimum === undefined || minimumKeyword !== 'minimum')
      ? `minimum:${formatBounds.minimum}`
      : undefined,
    typeof schema.exclusiveMinimum === 'number'
      ? `exclusiveMinimum:${schema.exclusiveMinimum}`
      : undefined,
    schema.maximum !== undefined
      ? `${maximumKeyword}:${maximumKeyword === 'maximum' ? (formatBounds.maximum ?? schema.maximum) : schema.maximum}`
      : undefined,
    formatBounds.maximum !== undefined &&
    (schema.maximum === undefined || maximumKeyword !== 'maximum')
      ? `maximum:${formatBounds.maximum}`
      : undefined,
    typeof schema.exclusiveMaximum === 'number'
      ? `exclusiveMaximum:${schema.exclusiveMaximum}`
      : undefined,
    schema.multipleOf !== undefined ? `multipleOf:${schema.multipleOf}` : undefined,
    errorMessageField,
    ...typeboxMetaOpts(schema),
    ...typeboxDefaultOpt(schema),
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.Number({${opts.join(',')}})`
  }
  return 'Type.Number()'
}

/**
 * The bounds a fixed-width format (`int32` / `uint32` for an integer, `float` / `float32`
 * for a number) adds to a node, as the literals to emit: each is left out when the node's
 * own bound on that side is already as tight, so the tighter of the two applies.
 */
export function fixedWidthBounds(schema: JSONSchema, kind: 'integer' | 'number') {
  const { format, minimum, maximum, exclusiveMinimum, exclusiveMaximum } = schema
  const range =
    kind === 'integer'
      ? format === 'int32' || format === 'uint32'
        ? NUMBER_RANGES[format]
        : undefined
      : format === 'float' || format === 'float32'
        ? NUMBER_RANGES.float32
        : undefined
  if (range === undefined) return {}
  const lowerBounds = [
    ...(minimum === undefined ? [] : [minimum]),
    ...(typeof exclusiveMinimum === 'number' ? [exclusiveMinimum] : []),
  ]
  const upperBounds = [
    ...(maximum === undefined ? [] : [maximum]),
    ...(typeof exclusiveMaximum === 'number' ? [exclusiveMaximum] : []),
  ]
  return {
    minimum: lowerBounds.some((bound) => bound >= Number(range.minimum))
      ? undefined
      : range.minimum,
    maximum: upperBounds.some((bound) => bound <= Number(range.maximum))
      ? undefined
      : range.maximum,
  }
}
