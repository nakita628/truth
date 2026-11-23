import { QUOTE_OR_BACKSLASH_PATTERN } from '../../constants/index.js'
import { isComposite } from '../../guard/index.js'
import { bigintValueLiteral } from '../../helper/bigint.js'
import { arktypeUnionLimit } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { isInt64 } from './integer.js'

function lit(v: unknown, isBigint: boolean) {
  if (v === null) return 'null'
  if (typeof v === 'string') return `'${v}'`
  if (typeof v === 'number' && isBigint) return bigintValueLiteral(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- JSON.stringify returns undefined for undefined, a function or a symbol; lib.d.ts types it as string
  return JSON.stringify(v) ?? 'null'
}

/** A member of a string-DSL union that is one literal, and the same text as a JS literal. */
const DSL_LITERAL_PATTERN = /^(?:'[^'\\]*'|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?n?|true|false|null)$/u

/** Whether every member of a string-DSL union is a single literal `type.enumerated` takes. */
export function isDslLiteralUnion(members: readonly string[]) {
  return members.every((member) => DSL_LITERAL_PATTERN.test(member))
}

/**
 * The ArkType definition of an enum: a `"a | b | c"` string union, or
 * `type.enumerated(a, b, c)` past the members {@link arktypeUnionLimit} allows. The members of an
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

  const members = schema.enum.map((v) => lit(v, isBigint))
  if (members.length > arktypeUnionLimit(members)) {
    return `type.enumerated(${members.join(',')})${describe}`
  }
  const expr = `"${members.join(' | ')}"`
  if (errorMessage) return `type(${expr})${describe}`
  return expr
}
