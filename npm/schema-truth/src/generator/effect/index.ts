import { DEFAULT_ROOT_NAME, UNSAFE_GENERATED_MARKER } from '../../constants/index.js'
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
import { effect } from './effect.js'
import { type } from './type.js'

/** The root name when the document has none, or when its title would shadow the import. */
const EFFECT_ROOT_FALLBACK = `${DEFAULT_ROOT_NAME}_`

/**
 * A whole JSON Schema document as an Effect Schema module: imports, `$defs` in
 * dependency order, the root export, and the inferred type.
 *
 * `options.readonly` is accepted for API symmetry and is a no-op: `Schema.Struct` and
 * `Schema.Array` are already readonly at the type level.
 */
export function schemaToEffect(input: JSONSchema, options?: GenerateOptions): string {
  // Every schema a reference reaches is a top-level definition, and a polymorphic base
  // and its subtypes do not refer to each other in a loop.
  const schema = withPolymorphicBases(hoistNestedRefs(sanitizeSchema(input)))
  const exportType = options?.exportType ?? true
  const baseOptions = emitOptionsOf(options)
  const codeExtensionsPresent =
    baseOptions.unsafeCodeExtensions === true && findCodeExtensionKeysInSchema(schema).length > 0
  const toName = schemaNamer(baseOptions.openapi)
  // A root named `Schema` would collide with `import { Schema } from "effect"`.
  const pascalTitle = rootNameOf(schema, toName, EFFECT_ROOT_FALLBACK)
  const plan = planDocument(
    schema,
    pascalTitle === DEFAULT_ROOT_NAME ? EFFECT_ROOT_FALLBACK : pascalTitle,
  )
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

  // A recursive declaration needs an explicit annotation, since the schema is
  // referenced inside its own initializer. `Schema.Schema<T>` constrains only
  // the decoded `Type` — which is what `_X` describes and what the exported
  // type reads — while `Schema.Codec<T>` would also pin `Encoded` to `T` and
  // reject any field carrying a decoding default or other transformation.
  const schemaDefsCode = renderDefinitions(
    plan,
    toName,
    (def, name) =>
      `const ${name}: Schema.Schema<_${name}> = ${effect(def, name, true, emitOptions)}`,
  )

  const rootSchema = effect(plan.root, rootName, true, emitOptions)
  const rootExport = needsTypeDef
    ? `export const ${rootName}: Schema.Schema<_${rootName}> = ${rootSchema}`
    : `export const ${rootName} = ${rootSchema}`

  // `Effect` backs decoding defaults, `SchemaGetter` / `SchemaIssue` an intersection that
  // decodes every member, and `SchemaTransformation` the string case/boolean conversions;
  // import each only when one is emitted.
  const emitted = `${schemaDefsCode}\n${rootExport}`
  const modules = [
    ...(/(?<![\w.])Effect\./u.test(emitted) ? ['Effect'] : []),
    'Schema',
    ...(emitted.includes('SchemaGetter.') ? ['SchemaGetter'] : []),
    ...(emitted.includes('SchemaIssue.') ? ['SchemaIssue'] : []),
    ...(emitted.includes('SchemaTransformation.') ? ['SchemaTransformation'] : []),
  ]
  const importLine = `import { ${modules.join(', ')} } from "effect"`

  return [
    ...(codeExtensionsPresent ? [UNSAFE_GENERATED_MARKER] : []),
    importLine,
    typeDefsCode,
    schemaDefsCode,
    rootExport,
    ...(exportType ? [`export type ${rootName} = typeof ${rootName}.Type`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
