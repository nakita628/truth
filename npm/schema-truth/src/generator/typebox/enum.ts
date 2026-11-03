import { isComposite } from '../../guard/index.js'
import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

function lit(v: unknown): string {
  if (v === null) return 'null'
  if (typeof v === 'string') return JSON.stringify(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v) ?? 'null'
}

/**
 * One enum member as a TypeBox type. TypeBox v1's `TLiteralValue` excludes `null`
 * (string | number | boolean | bigint only), so a `null` member is `Type.Null()`, not
 * `Type.Literal(null)`.
 */
function member(v: unknown): string {
  return v === null ? 'Type.Null()' : `Type.Literal(${lit(v)})`
}

export function _enum(schema: JSONSchema, ref?: string) {
  // v3.0: x-enum-message overrides x-error-message for enum mismatch.
  const enumMessage = schema['x-enum-message']
  const errorMessage = enumMessage ?? schema['x-error-message']
  const metaOpts = [...typeboxRefOpt(ref), ...typeboxMetaOpts(schema), ...typeboxDefaultOpt(schema)]
  const optsParts = [
    errorMessage ? `errorMessage:${JSON.stringify(errorMessage)}` : undefined,
    ...metaOpts,
  ].filter((v) => v !== undefined)
  const optsTrailer = optsParts.length > 0 ? `,{${optsParts.join(',')}}` : ''
  if (!schema.enum || schema.enum.length === 0) {
    return optsParts.length > 0 ? `Type.Any({${optsParts.join(',')}})` : 'Type.Any()'
  }
  // TypeBox has no literal form for array/object members (`TLiteralValue` is
  // scalar-only); enums containing one fall back to Any, like arktype's unknown.
  if (schema.enum.some(isComposite)) {
    return optsParts.length > 0 ? `Type.Any({${optsParts.join(',')}})` : 'Type.Any()'
  }
  if (schema.enum.length === 1) {
    return schema.enum[0] === null
      ? `Type.Null(${optsParts.length > 0 ? `{${optsParts.join(',')}}` : ''})`
      : `Type.Literal(${lit(schema.enum[0])}${optsTrailer})`
  }
  return `Type.Union([${schema.enum.map(member).join(',')}]${optsTrailer})`
}
