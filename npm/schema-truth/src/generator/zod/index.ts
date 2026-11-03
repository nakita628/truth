import { UNSAFE_GENERATED_MARKER } from '../../constants/index.js'
import {
  definitionsOf,
  emitOptionsOf,
  findCodeExtensionKeysInSchema,
  hasRootSelfReference,
  hoistNestedRefs,
  planDocument,
  renderDefinitions,
  rootNameOf,
  sanitizeSchema,
  schemaNamer,
  withPolymorphicBases,
} from '../../helper/index.js'
import type { GenerateOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { type } from './type.js'
import { zod } from './zod.js'

/**
 * A whole JSON Schema document as a Zod module: imports, `$defs` in dependency order,
 * the root export, and the inferred type.
 */
export function schemaToZod(input: JSONSchema, options?: GenerateOptions): string {
  // Every schema a reference reaches is a top-level definition, and a polymorphic base
  // and its subtypes do not refer to each other in a loop.
  const schema = withPolymorphicBases(hoistNestedRefs(sanitizeSchema(input)))
  const exportType = options?.exportType ?? true
  const baseOptions = emitOptionsOf(options)
  const codeExtensionsPresent =
    baseOptions.unsafeCodeExtensions === true && findCodeExtensionKeysInSchema(schema).length > 0
  const toName = schemaNamer(baseOptions.openapi)
  const plan = planDocument(schema, rootNameOf(schema, toName))
  const definitions = definitionsOf(baseOptions, plan.definitions)
  const emitOptions = definitions === undefined ? baseOptions : { ...baseOptions, definitions }
  const { rootName } = plan
  const needsTypeDef = plan.hasDefinitions || hasRootSelfReference(schema)

  const typeDefsCode = needsTypeDef
    ? [
        `type _${rootName} = ${type(plan.root, rootName)}`,
        renderDefinitions(plan, toName, (def, name) => `type _${name} = ${type(def, name)}`),
      ]
        .filter(Boolean)
        .join('\n\n')
    : ''

  const schemaDefsCode = renderDefinitions(
    plan,
    toName,
    (def, name) => `const ${name}: z.ZodType<_${name}> = ${zod(def, name, true, emitOptions)}`,
  )

  const rootSchema = zod(plan.root, rootName, true, emitOptions)
  const rootExport = needsTypeDef
    ? `export const ${rootName}: z.ZodType<_${rootName}> = ${rootSchema}`
    : `export const ${rootName} = ${rootSchema}`

  return [
    ...(codeExtensionsPresent ? [UNSAFE_GENERATED_MARKER] : []),
    `import * as z from 'zod'`,
    typeDefsCode,
    schemaDefsCode,
    rootExport,
    ...(exportType ? [`export type ${rootName} = z.infer<typeof ${rootName}>`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
