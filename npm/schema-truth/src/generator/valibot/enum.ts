import { hasType } from '../../guard/index.js'
import { deepEqualExpression } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { valibotErrorPart } from '../../utils/index.js'
import { isInt64 } from './integer.js'

function lit(v: unknown, isBigint: boolean): string {
  if (v === null) return 'null'
  if (typeof v === 'string') return `'${v.replaceAll("'", "\\'")}'`
  if (typeof v === 'number' && isBigint) return `${v}n`
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v) ?? 'null'
}

/**
 * Generates a Valibot enum schema. String enums map to `v.picklist`,
 * number/integer/boolean enums to `v.union([v.literal(...), ...])`,
 * array enums to `v.tuple` or `v.union`, single values to `v.literal`. The members of
 * an int64 / uint64 enum are bigint literals, as the value they match is.
 *
 * `x-error-message` (whole-enum) is applied **only to the outermost
 * wrapper**. Inner v.literal entries inside a wrapper never receive a
 * duplicate `error:` arg — the outer wrapper already shadows inner
 * messages on validation failure.
 *
 * Per-literal `x-enum-error-messages` was removed entirely: a rejected
 * value by definition isn't in the enum, so a per-literal branch can
 * never match. Whole-enum messages come from `x-error-message`;
 * finer-grained business rules belong in handler code, not the schema.
 */
export function _enum(schema: JSONSchema) {
  if (!schema.enum || schema.enum.length === 0) return 'v.any()'
  const isBigint = isInt64(schema)
  // v3.0: x-enum-message overrides x-error-message for the enum wrapper.
  const enumMessage = schema['x-enum-message']
  const errorMessage = enumMessage ?? schema['x-error-message']
  const errorArg = valibotErrorPart(errorMessage)
  // `v.literal` only accepts string/number/boolean. `null` → `v.null()`, and
  // object members → a deep-equality `v.custom` (arrays are handled as tuples by
  // the callers below); primitives stay on `v.literal`.
  const litSchema = (v: unknown, errPart: string): string => {
    if (v === null) return `v.null(${errPart.replace(/^,/, '')})`
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      return `v.literal(${lit(v, isBigint)}${errPart})`
    }
    return `v.custom<${JSON.stringify(v)}>((input) => ${deepEqualExpression(v, 'input')}${errPart})`
  }
  const innerLit = (v: unknown): string => litSchema(v, '')
  const outerLit = (v: unknown): string => litSchema(v, errorArg)
  const innerTuple = (arr: readonly unknown[]): string =>
    `v.tuple([${arr.map(innerLit).join(',')}])`
  const outerTuple = (arr: readonly unknown[]): string =>
    `v.tuple([${arr.map(innerLit).join(',')}]${errorArg})`
  if (hasType(schema, 'number') || hasType(schema, 'integer') || hasType(schema, 'boolean')) {
    return schema.enum.length > 1
      ? `v.union([${schema.enum.map(innerLit).join(',')}]${errorArg})`
      : outerLit(schema.enum[0])
  }
  if (hasType(schema, 'array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return outerTuple(schema.enum[0])
    }
    const parts = schema.enum.map((v: unknown) => (Array.isArray(v) ? innerTuple(v) : innerLit(v)))
    return `v.union([${parts.join(',')}]${errorArg})`
  }
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      return `v.picklist(${JSON.stringify(schema.enum)}${errorArg})`
    }
    return outerLit(schema.enum[0])
  }
  if (schema.enum.length > 1) {
    return `v.union([${schema.enum.map(innerLit).join(',')}]${errorArg})`
  }
  return outerLit(schema.enum[0])
}
