import { ANCHOR_REF_PATTERN, DEFINITION_POINTER_PATTERN } from '../constants/index.js'
import { isRootRef } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { collectDefinitions } from './schema.js'
import { walkSchema } from './walk.js'

/**
 * The definition a local `$ref` names, in any form the generators understand:
 * `#/definitions/X`, `#/$defs/X` and the bare `#X` shorthand. `undefined` for the
 * whole-document reference and for a pointer into a sub-schema.
 */
export function localDefinitionName(ref: string): string | undefined {
  return (
    DEFINITION_POINTER_PATTERN.exec(ref)?.groups?.name ?? ANCHOR_REF_PATTERN.exec(ref)?.groups?.name
  )
}

/**
 * Collect the local definition names a schema refers to. Nested `definitions`/`$defs`
 * are not traversed: only references reachable from the schema body count as edges.
 */
function collectLocalRefs(schema: JSONSchema): readonly string[] {
  const refs = new Set<string>()
  for (const node of walkSchema(schema, { skipDefinitions: true })) {
    if (typeof node.$ref !== 'string') continue
    const name = localDefinitionName(node.$ref)
    if (name !== undefined) refs.add(name)
  }
  return [...refs]
}

/**
 * True when a schema body refers back to itself, ignoring anything nested
 * under `definitions`/`$defs`.
 *
 * By default only a whole-document reference (`$ref: "#"` or `""`) counts.
 * Pass `isSelfRef` to also recognise a named reference that resolves back to
 * the schema being emitted — an OpenAPI component referencing its own
 * `#/components/schemas/...` entry, for instance.
 */
export function hasRootSelfReference(
  schema: JSONSchema,
  isSelfRef: (ref: string) => boolean = isRootRef,
): boolean {
  for (const node of walkSchema(schema, { skipDefinitions: true, skipRoot: true })) {
    if (typeof node.$ref === 'string' && isSelfRef(node.$ref)) return true
  }
  return false
}

/**
 * Names of the local definitions that take part in a `$ref` cycle — either a
 * self loop (`A -> A`) or a mutual one (`A -> B -> A`).
 *
 * Generators that cannot express a cycle with plain `const` declarations (a
 * later definition would be referenced before initialisation) use this to
 * switch those definitions over to a by-name construct instead.
 *
 * @example
 * ```ts
 * cyclicDefinitionNames({
 *   $defs: {
 *     A: { properties: { b: { $ref: '#/$defs/B' } } },
 *     B: { properties: { a: { $ref: '#/$defs/A' } } },
 *   },
 * }) // Set { 'A', 'B' }
 * ```
 */
export function cyclicDefinitionNames(schema: JSONSchema): ReadonlySet<string> {
  const definitions = collectDefinitions(schema)

  const edges = new Map<string, readonly string[]>()
  for (const [name, def] of Object.entries(definitions)) {
    edges.set(
      name,
      collectLocalRefs(def).filter((ref) => ref in definitions),
    )
  }

  // Iterative DFS over the reference graph; every name still on the current
  // path when an edge loops back to it is part of that cycle.
  const cyclic = new Set<string>()
  const state = new Map<string, 'visiting' | 'done'>()
  const path: string[] = []

  const visit = (start: string): void => {
    // Each frame is `[name, leaving]`; the `leaving` frame is pushed before the
    // children so it pops once the whole subtree is done.
    const work: [string, boolean][] = [[start, false]]
    while (work.length > 0) {
      const entry = work.pop()
      if (entry === undefined) continue
      const [name, leaving] = entry
      if (leaving) {
        path.pop()
        state.set(name, 'done')
        continue
      }
      if (state.get(name) === 'done') continue
      if (state.get(name) === 'visiting') {
        // Back edge: everything from `name` to the top of the path is cyclic.
        for (let i = path.lastIndexOf(name); i >= 0 && i < path.length; i++) {
          const onCycle = path[i]
          if (onCycle !== undefined) cyclic.add(onCycle)
        }
        continue
      }
      state.set(name, 'visiting')
      path.push(name)
      work.push([name, true])
      for (const next of edges.get(name) ?? []) work.push([next, false])
    }
  }

  for (const name of Object.keys(definitions).toSorted()) visit(name)

  return cyclic
}
