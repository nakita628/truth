import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

export function number(schema: JSONSchema, ref?: string) {
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const minMessage = schema['x-minimum-message']
  const maxMessage = schema['x-maximum-message']
  const exclusiveMinimumMessage = schema['x-exclusiveMinimum-message']
  const exclusiveMaximumMessage = schema['x-exclusiveMaximum-message']
  const multipleOfMessage = schema['x-multipleOf-message']
  // ajv-errors `errorMessage`: string for the common case (only
  // `x-error-message` set); object form when per-keyword messages are
  // present, with `x-error-message` joining as the catch-all under the
  // ajv-errors `_` convention. See typebox/integer.ts for the same pattern.
  const perKeywordEntries: string[] = []
  if (requiredMessage) perKeywordEntries.push(`required:${JSON.stringify(requiredMessage)}`)
  if (minMessage) perKeywordEntries.push(`minimum:${JSON.stringify(minMessage)}`)
  if (maxMessage) perKeywordEntries.push(`maximum:${JSON.stringify(maxMessage)}`)
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
    schema.minimum !== undefined ? `minimum:${schema.minimum}` : undefined,
    typeof schema.exclusiveMinimum === 'number'
      ? `exclusiveMinimum:${schema.exclusiveMinimum}`
      : undefined,
    schema.maximum !== undefined ? `maximum:${schema.maximum}` : undefined,
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
