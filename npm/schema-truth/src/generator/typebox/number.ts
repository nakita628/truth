import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

export function number(schema: JSONSchema, ref?: string) {
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const minMessage = schema['x-minimum-message']
  const maxMessage = schema['x-maximum-message']
  // Draft-04 spells an exclusive bound as `minimum` plus a boolean `exclusiveMinimum`.
  // TypeBox reads the numeric keyword only, so the bound moves under it, and the
  // message written for `minimum` follows when the exclusive keyword has none.
  const minimumKeyword =
    schema.exclusiveMinimum === true && schema.minimum !== undefined
      ? 'exclusiveMinimum'
      : 'minimum'
  const maximumKeyword =
    schema.exclusiveMaximum === true && schema.maximum !== undefined
      ? 'exclusiveMaximum'
      : 'maximum'
  const exclusiveMinimumMessage =
    schema['x-exclusiveMinimum-message'] ??
    (minimumKeyword === 'exclusiveMinimum' ? minMessage : undefined)
  const exclusiveMaximumMessage =
    schema['x-exclusiveMaximum-message'] ??
    (maximumKeyword === 'exclusiveMaximum' ? maxMessage : undefined)
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

  const opts = [
    ...typeboxRefOpt(ref),
    schema.minimum !== undefined ? `${minimumKeyword}:${schema.minimum}` : undefined,
    typeof schema.exclusiveMinimum === 'number'
      ? `exclusiveMinimum:${schema.exclusiveMinimum}`
      : undefined,
    schema.maximum !== undefined ? `${maximumKeyword}:${schema.maximum}` : undefined,
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
