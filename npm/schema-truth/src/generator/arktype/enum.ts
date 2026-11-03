import { QUOTE_OR_BACKSLASH_PATTERN } from '../../constants/index.js'
import { isComposite } from '../../guard/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { isInt64 } from './integer.js'

function lit(v: unknown, isBigint: boolean): string {
  if (v === null) return 'null'
  if (typeof v === 'string') return `'${v}'`
  if (typeof v === 'number' && isBigint) return `${v}n`
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v) ?? 'null'
}

/**
 * The ArkType definition of an enum: a `"a | b | c"` string union. The members of an
 * int64 / uint64 enum are bigint literals, as the value they match is.
 */
export function _enum(schema: JSONSchema) {
  // v3.0: x-enum-message overrides x-error-message for the enum wrapper.
  const enumMessage = schema['x-enum-message']
  const errorMessage = enumMessage ?? schema['x-error-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''

  if (!schema.enum || schema.enum.length === 0) return '"unknown"'
  const isBigint = isInt64(schema)

  // ArkType enums are a `"a | b | c"` string union, which can't represent
  // array/object members (their JSON form embeds quotes that break the string).
  // Such pathological enums fall back to `unknown`.
  if (schema.enum.some(isComposite)) return '"unknown"'

  // A quote or backslash in a member breaks both the arktype string DSL literal
  // and the surrounding JS string; such enums use the runtime enumerated form.
  const hasUnsafeString = schema.enum.some(
    (v) => typeof v === 'string' && QUOTE_OR_BACKSLASH_PATTERN.test(v),
  )
  if (hasUnsafeString) {
    const expr = `type.enumerated(${schema.enum.map((v) => JSON.stringify(v)).join(',')})`
    if (errorMessage) return `${expr}${describe}`
    return expr
  }

  if (schema.enum.length === 1) {
    const expr = `"${lit(schema.enum[0], isBigint)}"`
    if (errorMessage) return `type(${expr})${describe}`
    return expr
  }

  const expr = `"${schema.enum.map((v) => lit(v, isBigint)).join(' | ')}"`
  if (errorMessage) return `type(${expr})${describe}`
  return expr
}
