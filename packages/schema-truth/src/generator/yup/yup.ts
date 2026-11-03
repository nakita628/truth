import type { JSONSchema } from '../../parser/index.js'
import { normalizeTypes } from '../../utils/index.js'
import { integer } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

/**
 * Generate a Yup expression from one JSON Schema node.
 *
 * Unsupported keywords, combinators, `$ref` and `x-*` extensions are silent
 * no-ops. Unknown nodes fall back to `yup.mixed()`.
 *
 * @example
 * ```ts
 * yup({ type: 'string' }) // 'yup.string()'
 * ```
 */
export function yup(schema: JSONSchema): string {
  if (schema.properties !== undefined) return object(schema)

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return string(schema)
  if (types.includes('number')) return number(schema)
  if (types.includes('integer')) return integer(schema)
  if (types.includes('object')) return object(schema)
  return 'yup.mixed()'
}
