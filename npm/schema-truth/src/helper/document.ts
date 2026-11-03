import { DEFAULT_ROOT_NAME, MISSING_DEFINITION_PREFIX } from '../constants/index.js'
import type { EmitOptions, GenerateOptions } from '../options/index.js'
import type { JSONSchema } from '../parser/index.js'
import { toIdentifierPascalCase, toPascalCase } from '../utils/index.js'
import { resolveSchemaDependenciesFromSchema } from './resolve-schema-dependencies-from-schema.js'
import { collectDefinitions } from './schema.js'

/** The node options of a document generation, with the unset parameter options left out. */
export function emitOptionsOf(options: GenerateOptions | undefined): EmitOptions {
  return {
    openapi: options?.openapi ?? false,
    readonly: options?.readonly ?? false,
    unsafeCodeExtensions: options?.unsafeCodeExtensions ?? false,
    ...(options?.paramIn !== undefined && { paramIn: options.paramIn }),
    ...(options?.style !== undefined && { style: options.style }),
    ...(options?.explode !== undefined && { explode: options.explode }),
    ...(options?.allowEmptyValue !== undefined && { allowEmptyValue: options.allowEmptyValue }),
    ...(options?.contentType !== undefined && { contentType: options.contentType }),
    ...(options?.properties !== undefined && { properties: options.properties }),
    ...(options?.definitions !== undefined && { definitions: options.definitions }),
  }
}

/**
 * `options.definitions` plus the document's own `$defs` / `definitions`. The document
 * wins on a shared name. `undefined` when neither holds a schema.
 */
export function definitionsOf(
  options: EmitOptions | undefined,
  document: { readonly [name: string]: JSONSchema },
): EmitOptions['definitions'] {
  if (Object.keys(document).length === 0 && options?.definitions === undefined) return undefined
  return { ...options?.definitions, ...document }
}

/**
 * How a document names its schemas. An OpenAPI component name is always made a valid
 * identifier; a plain JSON Schema title keeps its hyphens and underscores for back-compat.
 */
export function schemaNamer(openapi: boolean | undefined): (name: string) => string {
  return openapi === true ? toIdentifierPascalCase : toPascalCase
}

/** The name the root schema is exported under: its `title`, or `fallback`. */
export function rootNameOf(
  schema: JSONSchema,
  toName: (name: string) => string,
  fallback: string = DEFAULT_ROOT_NAME,
): string {
  return schema.title ? toName(schema.title) : fallback
}

/** The comment left where a `$ref` names a definition the document does not hold. */
export function missingDefinitionComment(name: string): string {
  return `${MISSING_DEFINITION_PREFIX}${name}`
}

/** What a document generator has to lay out, read once from the schema. */
export type DocumentPlan = {
  /** The name of the exported root schema. */
  readonly rootName: string
  /** `definitions` and `$defs` as one map. */
  readonly definitions: { readonly [k: string]: JSONSchema }
  /** Whether the map holds anything. */
  readonly hasDefinitions: boolean
  /** Every definition name, in dependency order: a definition after what it refers to. */
  readonly orderedNames: readonly string[]
  /** The definition that shares the root's name, when one does: it *is* the root. */
  readonly rootDefinition: JSONSchema | undefined
  /** `orderedNames` without the root's own definition. */
  readonly nonRootNames: readonly string[]
  /** The schema emitted as the root: `rootDefinition`, else the document itself. */
  readonly root: JSONSchema
}

/**
 * The plan of a document: its definitions in dependency order, and which of them, if
 * any, is the root under another name.
 */
export function planDocument(schema: JSONSchema, rootName: string): DocumentPlan {
  const definitions = collectDefinitions(schema)
  const hasDefinitions = Object.keys(definitions).length > 0
  const orderedNames = hasDefinitions ? resolveSchemaDependenciesFromSchema(schema) : []
  const rootDefinition = definitions[rootName]
  return {
    rootName,
    definitions,
    hasDefinitions,
    orderedNames,
    rootDefinition,
    nonRootNames:
      rootDefinition === undefined
        ? orderedNames
        : orderedNames.filter((name) => name !== rootName),
    root: rootDefinition ?? schema,
  }
}

/**
 * Every non-root definition rendered through `render` and joined as paragraphs, with a
 * comment standing in for a definition the document names but does not hold.
 */
export function renderDefinitions(
  plan: DocumentPlan,
  toName: (name: string) => string,
  render: (definition: JSONSchema, name: string) => string,
): string {
  return plan.nonRootNames
    .map((name) => {
      const definition = plan.definitions[name]
      return definition === undefined
        ? missingDefinitionComment(name)
        : render(definition, toName(name))
    })
    .join('\n\n')
}
