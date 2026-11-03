import { NOT_KEYWORD_UNSUPPORTED_MARKER } from '../../constants/index.js'
import { isRootRef } from '../../guard/index.js'
import {
  cyclicDefinitionNames,
  definitionsOf,
  emitOptionsOf,
  hasNotKeyword,
  hasRootSelfReference,
  hoistNestedRefs,
  missingDefinitionComment,
  planDocument,
  renderDefinitions,
  rootNameOf,
  sanitizeSchema,
  schemaNamer,
  withPolymorphicBases,
} from '../../helper/index.js'
import type { GenerateOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { resolveOpenAPIRef } from '../../utils/index.js'
import { typebox } from './typebox.js'
import type { TypeboxOptions } from './typebox.js'

/** The options of `schemaToTypebox`: the common ones, plus a host `$ref` name. */
export type TypeboxGenerateOptions = Omit<GenerateOptions, 'unsafeCodeExtensions'> & {
  /**
   * Host `$ref` name for OpenAPI component registration. TypeBox has no
   * post-construction `.meta()`, so this lands in the outermost builder's
   * options (`Type.String({ref})`, `Type.Object({…},{ref})`, or the third
   * argument of `Type.Cyclic`). Named `$defs` members are not given this
   * value. Omit it and the emit is unchanged.
   */
  readonly ref?: string
}

/** The import line, carrying `Codec` only when the emitted source calls it. */
function importLine(emitted: string): string {
  return `import { ${emitted.includes('Codec(') ? 'Codec, ' : ''}Type, type Static } from 'typebox'`
}

/**
 * A whole JSON Schema document as a TypeBox module. A `$ref` cycle cannot be expressed
 * with plain `const` declarations, so a cyclic document becomes one
 * `Type.Cyclic($defs, root)` map instead.
 */
export function schemaToTypebox(input: JSONSchema, options?: TypeboxGenerateOptions): string {
  // Every schema a reference reaches is a top-level definition, and a polymorphic base
  // and its subtypes do not refer to each other in a loop.
  const schema = withPolymorphicBases(hoistNestedRefs(sanitizeSchema(input)))
  const exportType = options?.exportType ?? true
  const openapi = options?.openapi ?? false
  const hostRef = options?.ref
  const toName = schemaNamer(openapi)
  const plan = planDocument(schema, rootNameOf(schema, toName))
  const { rootName } = plan
  const definitions = definitionsOf(emitOptionsOf(options), plan.definitions)
  const genOptions: TypeboxOptions = {
    openapi,
    readonly: options?.readonly ?? false,
    ...(options?.paramIn !== undefined && { paramIn: options.paramIn }),
    ...(definitions !== undefined && { definitions }),
  }
  const rootOptions = hostRef === undefined ? genOptions : { ...genOptions, ref: hostRef }
  const notKeywordPresent = hasNotKeyword(schema)

  // A `$ref` cycle cannot be expressed with plain `const` declarations: the
  // first one would reference a peer declared later. TypeBox v1 answers this
  // with `Type.Cyclic($defs, root)`, where members refer to each other by name
  // through `Type.Ref`. Once any cycle is present every definition moves into
  // that one map, so a non-cyclic definition referencing a cyclic one still
  // resolves.
  const rootSelfReferential = hasRootSelfReference(
    plan.root,
    (ref) => isRootRef(ref) || (openapi && resolveOpenAPIRef(ref) === rootName),
  )
  const isCyclic = rootSelfReferential || cyclicDefinitionNames(schema).size > 0

  if (isCyclic) {
    const cyclicRefs = new Set([...plan.orderedNames.map(toName), rootName])
    const cyclicOptions = { ...genOptions, cyclicRefs }
    const members = [
      ...plan.nonRootNames.map((name) => {
        const def = plan.definitions[name]
        const pc = toName(name)
        return def
          ? `${pc}: ${typebox(def, pc, true, cyclicOptions)}`
          : missingDefinitionComment(name)
      }),
      `${rootName}: ${typebox(plan.root, rootName, true, cyclicOptions)}`,
    ].join(',\n')

    const cyclicRefOpt = hostRef === undefined ? '' : `,{ref:${JSON.stringify(hostRef)}}`
    const cyclicExport = `export const ${rootName} = Type.Cyclic({\n${members}\n},'${rootName}'${cyclicRefOpt})`

    return [
      ...(notKeywordPresent ? [NOT_KEYWORD_UNSUPPORTED_MARKER] : []),
      importLine(cyclicExport),
      cyclicExport,
      ...(exportType ? [`export type ${rootName} = Static<typeof ${rootName}>`] : []),
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  const schemaDefsCode = renderDefinitions(
    plan,
    toName,
    (def, name) => `const ${name} = ${typebox(def, name, true, genOptions)}`,
  )

  const rootExport = `export const ${rootName} = ${typebox(plan.root, rootName, true, rootOptions)}`

  // `Codec(...)` (string-wire coercion / transform) is a separate named export
  // from `typebox`; import it only when the generated code emitted one.
  return [
    ...(notKeywordPresent ? [NOT_KEYWORD_UNSUPPORTED_MARKER] : []),
    importLine(`${schemaDefsCode}\n${rootExport}`),
    schemaDefsCode,
    rootExport,
    ...(exportType ? [`export type ${rootName} = Static<typeof ${rootName}>`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
