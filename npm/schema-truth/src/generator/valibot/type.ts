import { DEFAULT_ROOT_NAME } from '../../constants/index.js'
import { typeDeclaration } from '../../helper/type.js'
import type { JSONSchema } from '../../parser/index.js'

/** The TypeScript type declared beside a recursive Valibot schema: its output type. */
export function type(schema: JSONSchema | undefined, rootName: string = DEFAULT_ROOT_NAME): string {
  return typeDeclaration(
    schema,
    {
      inferRoot: (name) => `v.InferOutput<typeof ${name}>`,
      readonly: false,
    },
    rootName,
  )
}
