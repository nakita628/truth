import { DEFAULT_ROOT_NAME } from '../../constants/index.js'
import { typeDeclaration } from '../../helper/type.js'
import type { JSONSchema } from '../../parser/index.js'

/** The TypeScript type declared beside a recursive Zod schema. */
export function type(schema: JSONSchema | undefined, rootName: string = DEFAULT_ROOT_NAME): string {
  return typeDeclaration(
    schema,
    {
      inferRoot: (name) => `z.infer<typeof ${name}>`,
      readonly: false,
    },
    rootName,
  )
}
