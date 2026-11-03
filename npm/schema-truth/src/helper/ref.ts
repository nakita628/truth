import { DEFAULT_ROOT_NAME, DEFINITION_REF_PREFIXES } from '../constants/index.js'
import { isDeepLocalPointer, isRootRef } from '../guard/index.js'
import { resolveOpenAPIRef } from '../utils/index.js'
import { schemaNamer } from './document.js'

/** How the declaration a `$ref` names is reached from the node being emitted. */
export type RefTarget =
  /**
   * Through a deferred thunk (`z.lazy`, `v.lazy`, `Schema.suspend`): the root itself, or
   * any declaration of a document whose schemas are declared ahead with a type annotation.
   */
  | { readonly kind: 'lazy'; readonly name: string }
  /** By its identifier: a declaration that is known to be initialised first. */
  | { readonly kind: 'value'; readonly name: string }
  /** A pointer into a sub-schema, which has no declaration of its own. */
  | { readonly kind: 'unknown' }
  /** A `$ref` the generators do not follow. */
  | { readonly kind: 'any' }

/**
 * Resolves a `$ref` for the Zod, Valibot and Effect generators, which name declarations
 * alike: a definition is `Name` inside a document (`isDocument`), `NameSchema` when a
 * single schema is emitted under the default root name, and a thunk everywhere else.
 */
export function refTarget(
  ref: string,
  rootName: string,
  isDocument: boolean,
  openapi: boolean | undefined,
): RefTarget {
  if (isRootRef(ref)) return { kind: 'lazy', name: rootName }
  if (isDeepLocalPointer(ref)) return { kind: 'unknown' }
  if (openapi) {
    const resolved = resolveOpenAPIRef(ref)
    if (resolved) {
      return resolved === rootName || isDocument
        ? { kind: 'lazy', name: resolved }
        : { kind: 'value', name: resolved }
    }
  }
  const toName = schemaNamer(openapi)
  const declared = (name: string): RefTarget => {
    if (name === rootName || isDocument) return { kind: 'lazy', name }
    if (rootName === DEFAULT_ROOT_NAME) return { kind: 'value', name: `${name}Schema` }
    return { kind: 'lazy', name }
  }
  for (const prefix of DEFINITION_REF_PREFIXES) {
    if (ref.startsWith(prefix)) return declared(toName(ref.slice(prefix.length)))
  }
  if (ref.startsWith('#')) {
    const refName = ref.slice(1)
    return refName === '' ? { kind: 'lazy', name: rootName } : declared(toName(refName))
  }
  if (ref.includes('#')) return { kind: 'unknown' }
  if (ref.startsWith('http')) {
    const last = ref.split('/').at(-1)
    if (last) return { kind: 'value', name: last.replace(/\.json$/, '') }
  }
  return { kind: 'any' }
}
