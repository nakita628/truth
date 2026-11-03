import type { JSONSchema } from '../parser/index.js'
import { localDefinitionName } from './cyclic.js'
import { collectDefinitions } from './schema.js'
import { walkSchema } from './walk.js'

/** The definition name the fragment of an external `$ref` points at, if it names one. */
function fragmentDefinitionName(fragment: string): string | undefined {
  return (
    /^\/(?:definitions|\$defs)\/(?<name>[^/]+)$/u.exec(fragment)?.groups?.name ??
    /^\/(?<name>[^/]+)$/u.exec(fragment)?.groups?.name
  )
}

/** A node that is a reference into a document: what it points at is the whole of what it says. */
function isPointerNode(node: { readonly [k: string]: unknown }): boolean {
  return typeof node.$ref === 'string' && node.$ref.includes('#')
}

/**
 * The definition names a definition refers to, sorted. A reference node is not descended
 * into, so a sibling keyword beside a `$ref` adds no edge.
 */
function collectRefs(definition: JSONSchema): readonly string[] {
  const refs = new Set<string>()
  for (const node of walkSchema(definition, { prune: isPointerNode })) {
    const ref = node.$ref
    if (typeof ref !== 'string' || ref === '#') continue
    const local = localDefinitionName(ref)
    if (local !== undefined) refs.add(local)
    if (!ref.includes('#')) continue
    const [, fragment] = ref.split('#')
    if (!fragment) continue
    const external = fragmentDefinitionName(fragment)
    if (external !== undefined) refs.add(external)
  }
  return [...refs].toSorted()
}

/**
 * Resolve schema dependencies and return them in topological order
 *
 * @param schema - JSON Schema object containing definitions or $defs
 * @returns Array of schema names in dependency order
 * @example
 * ```ts
 * const schema = {
 *   $defs: {
 *     animal: { type: 'object', properties: { name: { type: 'string' } } },
 *     zoo: { type: 'object', properties: { animals: { $ref: '#/$defs/animal' } } }
 *   }
 * }
 * resolveSchemaDependenciesFromSchema(schema) // ['animal', 'zoo']
 * ```
 */
export function resolveSchemaDependenciesFromSchema(schema: JSONSchema): string[] {
  const definitions = collectDefinitions(schema)

  const sorted: string[] = []
  const done = new Set<string>()
  const visiting = new Set<string>()

  const visit = (name: string): void => {
    if (done.has(name) || visiting.has(name)) return

    const definition = definitions[name]
    if (!definition) return

    visiting.add(name)
    for (const ref of collectRefs(definition)) {
      if (ref in definitions) visit(ref)
    }
    visiting.delete(name)

    done.add(name)
    sorted.push(name)
  }

  for (const name of Object.keys(definitions).toSorted()) {
    visit(name)
  }

  return sorted
}
