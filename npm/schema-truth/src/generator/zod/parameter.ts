import { parameterReaders } from '../../helper/parameter.js'
import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'

export { hasParameterSerialization, withoutParameterSerialization } from '../../helper/parameter.js'

/**
 * Wraps the root expression of a parameter's schema in what reads the parameter's
 * serialization: `allowEmptyValue`, a JSON `content`, or its `style` / `explode`.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#style-examples
 */
export function parameter(schema: JSONSchema, inner: string, options: EmitOptions | undefined) {
  return parameterReaders(schema, options, 'val').reduceRight(
    (acc, step) => `z.preprocess(${step},${acc})`,
    inner,
  )
}
