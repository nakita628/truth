import { DEFAULT_ROOT_NAME, DEFINITION_REF_PREFIXES } from '../constants/index.js'
import { isDeepLocalPointer, isRootRef } from '../guard/index.js'
import { resolveOpenAPIRef } from '../utils/index.js'
import { schemaNamer } from './document.js'

/**
 * Resolves a `$ref` for the Zod, Valibot and Effect generators, which name declarations
 * alike: a definition is `Name` inside a document (`isDocument`), `NameSchema` when a
 * single schema is emitted under the default root name, and a thunk everywhere else.
 *
 * The `kind` says how the declaration is reached from the node being emitted: `lazy` through
 * a deferred thunk (`z.lazy`, `v.lazy`, `Schema.suspend`), `value` by its identifier because
 * it is known to be initialised first, `unknown` for a pointer into a sub-schema, which has
 * no declaration of its own, and `any` for a `$ref` the generators do not follow.
 */
export function refTarget(
  ref: string,
  rootName: string,
  isDocument: boolean,
  openapi: boolean | undefined,
) {
  if (isRootRef(ref)) return { kind: 'lazy', name: rootName } as const
  if (isDeepLocalPointer(ref)) return { kind: 'unknown' } as const
  if (openapi) {
    const resolved = resolveOpenAPIRef(ref)
    if (resolved) {
      return resolved === rootName || isDocument
        ? ({ kind: 'lazy', name: resolved } as const)
        : ({ kind: 'value', name: resolved } as const)
    }
  }
  const toName = schemaNamer(openapi)
  const declared = (name: string) => {
    if (name === rootName || isDocument) return { kind: 'lazy', name } as const
    if (rootName === DEFAULT_ROOT_NAME) return { kind: 'value', name: `${name}Schema` } as const
    return { kind: 'lazy', name } as const
  }
  for (const prefix of DEFINITION_REF_PREFIXES) {
    if (ref.startsWith(prefix)) return declared(toName(ref.slice(prefix.length)))
  }
  if (ref.startsWith('#')) {
    const refName = ref.slice(1)
    return refName === '' ? ({ kind: 'lazy', name: rootName } as const) : declared(toName(refName))
  }
  if (ref.includes('#')) return { kind: 'unknown' } as const
  if (ref.startsWith('http')) {
    const last = ref.split('/').at(-1)
    if (last) return { kind: 'value', name: last.replace(/\.json$/, '') } as const
  }
  return { kind: 'any' } as const
}
