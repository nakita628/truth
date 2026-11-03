import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey } from '../../utils/index.js'
import { ajv } from './ajv.js'

/**
 * Reconstruct a draft-07 object schema from `type`, `properties` and `required`.
 * Property values recurse through {@link ajv}; other object keywords are dropped.
 */
export function object(schema: JSONSchema): string {
  const parts: string[] = [`type:'object'`]
  if (schema.properties !== undefined) {
    const props = Object.entries(schema.properties).map(
      ([key, propSchema]) => `${makeSafeKey(key)}:${ajv(propSchema)}`,
    )
    parts.push(`properties:{${props.join(',')}}`)
  }
  if (Array.isArray(schema.required) && schema.required.length > 0) {
    const required = schema.required.filter((key) => typeof key === 'string')
    if (required.length > 0) {
      parts.push(`required:[${required.map((key) => JSON.stringify(key)).join(',')}]`)
    }
  }
  return `{${parts.join(',')}}`
}
