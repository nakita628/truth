import type { JSONSchema } from '../../parser/index.js'

/**
 * Reconstruct a draft-07 string schema. `format` is emitted only for `email`
 * (the first-slice format); every other string keyword is dropped.
 */
export function string(schema: JSONSchema): string {
  const parts: string[] = [`type:'string'`]
  if (schema.format === 'email') parts.push(`format:'email'`)
  return `{${parts.join(',')}}`
}
