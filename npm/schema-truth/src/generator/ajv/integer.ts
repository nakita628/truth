import type { JSONSchema } from '../../parser/index.js'

/**
 * Reconstruct a draft-07 integer schema. `minimum` is the only numeric keyword
 * in this slice; `maximum`, `exclusiveMinimum` and `multipleOf` are dropped.
 */
export function integer(schema: JSONSchema): string {
  const parts: string[] = [`type:'integer'`]
  if (typeof schema.minimum === 'number') parts.push(`minimum:${schema.minimum}`)
  return `{${parts.join(',')}}`
}
