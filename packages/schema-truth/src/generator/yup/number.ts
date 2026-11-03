import type { JSONSchema } from '../../parser/index.js'

/**
 * Generate a Yup number schema. `minimum` becomes `.min(...)`; other numeric
 * keywords are silent no-ops in this slice.
 */
export function number(schema: JSONSchema) {
  const minimum = typeof schema.minimum === 'number' ? `.min(${schema.minimum})` : ''
  return `yup.number()${minimum}`
}
