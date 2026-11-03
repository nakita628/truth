import { DEFAULT_ROOT_NAME } from '../../constants/index.js'
import { typeDeclaration } from '../../helper/type.js'
import type { JSONSchema } from '../../parser/index.js'

/**
 * The TypeScript type declared beside a recursive Effect schema: its decoded `Type`, whose
 * arrays and properties are `readonly` as `Schema.Struct` and `Schema.Array` decode them.
 */
export function type(schema: JSONSchema | undefined, rootName: string = DEFAULT_ROOT_NAME): string {
  return typeDeclaration(
    schema,
    {
      inferRoot: (name) => `typeof ${name}.Type`,
      readonly: true,
    },
    rootName,
  )
}
