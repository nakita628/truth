import type { JSONSchema } from '../../parser/index.js'

/**
 * Reconstruct a draft-07 number schema. `minimum` is the only numeric keyword
 * in this slice; `maximum`, `exclusiveMinimum` and `multipleOf` are dropped.
 */
export function number(schema: JSONSchema): string {
  const parts: string[] = [`type:'number'`]
  if (typeof schema.minimum === 'number') parts.push(`minimum:${schema.minimum}`)
  return `{${parts.join(',')}}`
}
