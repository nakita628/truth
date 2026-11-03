import type { JSONSchema } from '../../parser/index.js'
import { normalizeTypes } from '../../utils/index.js'
import { integer } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

/**
 * One schema node to one Ajv draft-07 schema-object expression.
 *
 * Unsupported keywords, combinators, `$ref` and `x-*` extensions are silent
 * no-ops: the node still becomes a balanced object literal (`{}` when nothing
 * in this slice applies).
 *
 * @example
 * ```ts
 * ajv({ type: 'string', format: 'email' }) // "{type:'string',format:'email'}"
 * ```
 */
export function ajv(schema: JSONSchema): string {
  if (schema.properties !== undefined) return object(schema)
  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return string(schema)
  if (types.includes('number')) return number(schema)
  if (types.includes('integer')) return integer(schema)
  if (types.includes('object')) return object(schema)
  return '{}'
}
