import { hasType, isComposite, isPlainObject } from '../../guard/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey, zodErrorPart } from '../../utils/index.js'
import { isInt64 } from './integer.js'

/**
 * Generates a Zod enum schema. String enums map to `z.enum`, number/integer/
 * boolean enums to `z.union([z.literal(...), ...])`, array enums to `z.tuple`
 * or `z.union`, single values to `z.literal`.
 *
 * `x-error-message` (whole-enum) is applied **only to the outermost
 * wrapper** (z.enum / z.union / z.tuple, or the bare z.literal in the
 * single-value case). Inner z.literal entries inside a wrapper never
 * receive a duplicate `error:` arg — Zod's outer wrapper already shadows
 * inner messages on validation failure, so the inner copy was dead.
 *
 * Per-literal `x-enum-error-messages` was removed entirely: a rejected
 * value by definition isn't in the enum, so a per-literal
 * `value === 'admin'` branch can never match. Whole-enum messages
 * come from `x-error-message`; finer-grained business rules belong in
 * handler code, not the schema.
 */
function lit(v: unknown, isBigint: boolean): string {
  if (v === null) return 'null'
  if (typeof v === 'string') return `'${v.replaceAll("'", "\\'")}'`
  if (typeof v === 'number' && isBigint) return `${v}n`
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v) ?? 'null'
}

export function _enum(schema: JSONSchema) {
  // The members of an int64 / uint64 enum are bigint literals, as the value they match is.
  const isBigint = isInt64(schema)
  if (!schema.enum || schema.enum.length === 0) return 'z.any()'
  // v3.0: x-enum-message overrides x-error-message for the enum wrapper.
  // Zod v4 `z.enum` emits a single issue code (`invalid_value`) for both
  // type and value mismatches, so the override is a clearer name for the
  // enum case (no new capability).
  const enumMessage = schema['x-enum-message']
  const errorMessage = enumMessage ?? schema['x-error-message']
  const errorArg = zodErrorPart(errorMessage)
  // Zod v4 `z.literal` is primitive-only; array/object enum members need a
  // structural matcher (`z.tuple` / `z.strictObject`). Primitives and `null`
  // keep their `z.literal(...)` output byte-for-byte.
  const valueSchema = (v: unknown): string => {
    if (Array.isArray(v)) return `z.tuple([${v.map(valueSchema).join(',')}])`
    if (isPlainObject(v)) {
      const entries = Object.entries(v)
      return `z.strictObject({${entries.map(([k, val]) => `${makeSafeKey(k)}:${valueSchema(val)}`).join(',')}})`
    }
    return `z.literal(${lit(v, isBigint)})`
  }
  // Inner literal — used inside a wrapper (z.union / z.tuple) that
  // already carries `errorArg`, so we don't repeat it.
  const innerLit = (v: unknown): string => valueSchema(v)
  // Outer literal — used when the literal is the entire schema output.
  // Composite single values carry no error arg (rare; structural matcher only).
  const outerLit = (v: unknown): string =>
    isComposite(v) ? valueSchema(v) : `z.literal(${lit(v, isBigint)}${errorArg})`
  // Inner tuple — used inside a z.union of multiple tuples; the outer
  // union's errorArg covers this tuple too, so neither the tuple wrapper
  // nor its inner literals receive errorArg.
  const innerTuple = (arr: readonly unknown[]): string =>
    `z.tuple([${arr.map(innerLit).join(',')}])`
  // Outer tuple — used when a single tuple is the entire schema output.
  const outerTuple = (arr: readonly unknown[]): string =>
    `z.tuple([${arr.map(innerLit).join(',')}]${errorArg})`
  if (hasType(schema, 'number') || hasType(schema, 'integer') || hasType(schema, 'boolean')) {
    return schema.enum.length > 1
      ? `z.union([${schema.enum.map(innerLit).join(',')}]${errorArg})`
      : outerLit(schema.enum[0])
  }
  if (hasType(schema, 'array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return outerTuple(schema.enum[0])
    }
    const parts = schema.enum.map((v) => (Array.isArray(v) ? innerTuple(v) : innerLit(v)))
    return `z.union([${parts.join(',')}]${errorArg})`
  }
  if (schema.enum.every((v) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      return `z.enum(${JSON.stringify(schema.enum)}${errorArg})`
    }
    return outerLit(schema.enum[0])
  }
  if (schema.enum.length > 1) {
    return `z.union([${schema.enum.map(innerLit).join(',')}]${errorArg})`
  }
  return outerLit(schema.enum[0])
}
