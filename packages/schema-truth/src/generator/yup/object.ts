import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey } from '../../utils/index.js'
import { yup } from './yup.js'

/**
 * Generate a Yup object schema for a JSON Schema object node.
 *
 * Required properties get `.required()`; Yup 1.x object fields are optional
 * unless that is chained. Unsupported object keywords are silent no-ops.
 */
export function object(schema: JSONSchema) {
  if (!schema.properties) return 'yup.object({})'

  const required = Array.isArray(schema.required) ? schema.required : []
  const props = Object.entries(schema.properties).map(([key, propSchema]) => {
    const parsed = yup(propSchema)
    const suffix = required.includes(key) ? '.required()' : ''
    return `${makeSafeKey(key)}:${parsed}${suffix}`
  })
  return `yup.object({${props.join(',')}})`
}
