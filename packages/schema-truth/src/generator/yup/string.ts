import type { JSONSchema } from '../../parser/index.js'

/**
 * Generate a Yup string schema. `format: email` becomes `.email()`; every
 * other string keyword is a silent no-op in this slice.
 */
export function string(schema: JSONSchema) {
  return schema.format === 'email' ? 'yup.string().email()' : 'yup.string()'
}
