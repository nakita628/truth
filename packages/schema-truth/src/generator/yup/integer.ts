import type { JSONSchema } from '../../parser/index.js'

/**
 * Generate a Yup integer schema as `yup.number().integer()`, with `minimum`
 * as `.min(...)`. Other numeric keywords are silent no-ops in this slice.
 */
export function integer(schema: JSONSchema) {
  const minimum = typeof schema.minimum === 'number' ? `.min(${schema.minimum})` : ''
  return `yup.number().integer()${minimum}`
}
