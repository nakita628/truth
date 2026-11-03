import { hasType, isComposite } from '../../guard/index.js'
import { deepEqualExpression } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { effectError } from '../../utils/index.js'
import { isInt64 } from './integer.js'

function literal(v: unknown, isBigint: boolean): string {
  if (v === null) return 'null'
  if (typeof v === 'string') return `"${v}"`
  if (typeof v === 'number' && isBigint) return `${v}n`
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v) ?? 'null'
}

/**
 * A schema of JSON values compared by deep equality: `Schema.Literal` takes only a
 * primitive, so an object or array value is matched by a guard.
 */
export function deepEqualSchema(values: readonly unknown[]): string {
  const type = values.map((v) => JSON.stringify(v) ?? 'null').join('|')
  const test = values.map((v) => `(${deepEqualExpression(v, 'input')})`).join('||')
  return `Schema.declare((input: unknown): input is ${type} => ${test})`
}

/**
 * Generates an Effect Schema enum. Multi-value scalar enums map to
 * `Schema.Literals([...])` (v4 dropped the variadic `Schema.Literal(a, b)`
 * overload), array enums to `Schema.Tuple` or `Schema.Union`, single values to
 * `Schema.Literal`. The members of an int64 / uint64 enum are bigint literals, as the
 * value they match is.
 *
 * `x-error-message` (whole-enum) is applied **only to the outermost
 * expression** via `.annotate(...)`. Inner Schema.Literal entries
 * inside a Union/Tuple never receive their own annotations — the outer
 * annotation already covers them.
 *
 * Per-literal `x-enum-error-messages` was removed entirely: a rejected
 * value by definition isn't in the enum, so a per-literal branch can
 * never match. Whole-enum messages come from `x-error-message`;
 * finer-grained business rules belong in handler code, not the schema.
 */
export function _enum(schema: JSONSchema) {
  if (!schema.enum || schema.enum.length === 0) return 'Schema.Unknown'
  const isBigint = isInt64(schema)
  const lit = (v: unknown): string => literal(v, isBigint)

  // v3.0: x-enum-message overrides x-error-message for the enum wrapper.
  const enumMessage = schema['x-enum-message']
  const errorMessage = enumMessage ?? schema['x-error-message']
  const annotate = (code: string): string =>
    errorMessage ? `${code}.annotate(${effectError(errorMessage)})` : code
  const tuple = (arr: readonly unknown[]): string =>
    `Schema.Tuple([${arr.map((i: unknown) => `Schema.Literal(${lit(i)})`).join(',')}])`
  const literals = (values: readonly unknown[]): string =>
    values.length > 1
      ? `Schema.Literals([${values.map(lit).join(',')}])`
      : `Schema.Literal(${lit(values[0])})`
  if (hasType(schema, 'number') || hasType(schema, 'integer') || hasType(schema, 'boolean')) {
    return annotate(literals(schema.enum))
  }
  if (hasType(schema, 'array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return annotate(tuple(schema.enum[0]))
    }
    const parts = schema.enum.map((v: unknown) =>
      Array.isArray(v)
        ? tuple(v)
        : isComposite(v)
          ? deepEqualSchema([v])
          : `Schema.Literal(${lit(v)})`,
    )
    return annotate(`Schema.Union([${parts.join(',')}])`)
  }
  if (schema.enum.some(isComposite)) return annotate(deepEqualSchema(schema.enum))
  return annotate(literals(schema.enum))
}
