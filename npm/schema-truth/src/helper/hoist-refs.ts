import { DEFINITION_REF_PREFIXES } from '../constants/index.js'
import type { JSONSchema } from '../parser/index.js'

/** Keywords whose values are data, not schemas: a `$ref` string there is not a reference. */
const DATA_KEYWORDS = new Set(['const', 'default', 'enum', 'example', 'examples'])

/** Whether a `$ref` already names a definition directly (`#/$defs/X`). */
function isDefinitionRef(ref: string): boolean {
  return DEFINITION_REF_PREFIXES.some((prefix) => {
    if (!ref.startsWith(prefix)) return false
    const rest = ref.slice(prefix.length)
    return rest !== '' && !rest.includes('/')
  })
}

/** A local JSON Pointer `$ref` deeper than a definition: `#/$defs/A/properties/b`. */
function isNestedPointer(ref: string): boolean {
  return ref.startsWith('#/') && !isDefinitionRef(ref)
}

function decodeToken(token: string): string {
  return decodeURIComponent(token).replaceAll('~1', '/').replaceAll('~0', '~')
}

function resolvePointer(document: unknown, ref: string): unknown {
  let node = document
  for (const token of ref.slice(2).split('/').map(decodeToken)) {
    if (typeof node !== 'object' || node === null || !Object.hasOwn(node, token)) return undefined
    node = Reflect.get(node, token)
  }
  return node
}

function collectNestedPointers(node: unknown, found: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectNestedPointers(item, found)
    return
  }
  if (typeof node !== 'object' || node === null) return
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && isNestedPointer(value)) found.add(value)
    else if (!DATA_KEYWORDS.has(key)) collectNestedPointers(value, found)
  }
}

/** A JSON object read as a schema node: what a pointer reaches or a rewrite returns. */
function isSchemaNode(value: unknown): value is JSONSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function rewriteRefs(node: unknown, refs: ReadonlyMap<string, string>): unknown {
  if (Array.isArray(node)) return node.map((item) => rewriteRefs(item, refs))
  if (typeof node !== 'object' || node === null) return node
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => {
      if (key === '$ref' && typeof value === 'string') return [key, refs.get(value) ?? value]
      return [key, DATA_KEYWORDS.has(key) ? value : rewriteRefs(value, refs)]
    }),
  )
}

/**
 * Hoist every schema a `$ref` reaches through a nested JSON Pointer into a definition of
 * its own, and point the references at it.
 *
 * Bundling an external file leaves its `definitions` where the file was referenced, so a
 * reference inside it reads `#/$defs/Root/properties/root/definitions/Node`. The
 * generators name and declare top-level definitions only; a recursive schema reached that
 * way would otherwise be referenced by a name nothing declares. A hoisted definition is
 * named after the pointer's last token, numbered when the name is taken.
 *
 * Returns the document as given when it has no such reference.
 */
export function hoistNestedRefs(schema: JSONSchema): JSONSchema {
  const pointers = new Set<string>()
  collectNestedPointers(schema, pointers)
  if (pointers.size === 0) return schema
  const container =
    schema.$defs === undefined && schema.definitions !== undefined ? 'definitions' : '$defs'
  const taken = new Set([
    ...Object.keys(schema.$defs ?? {}),
    ...Object.keys(schema.definitions ?? {}),
  ])
  const refs = new Map<string, string>()
  const hoisted: [string, JSONSchema][] = []
  for (const pointer of pointers) {
    const target = resolvePointer(schema, pointer)
    if (!isSchemaNode(target)) continue
    const tokens = pointer.slice(2).split('/').map(decodeToken)
    const base = tokens.at(-1) ?? 'Definition'
    let name = base
    for (let index = 2; taken.has(name); index += 1) name = `${base}${index}`
    taken.add(name)
    refs.set(pointer, `#/${container}/${encodeURIComponent(name)}`)
    hoisted.push([name, target])
  }
  const rewritten = rewriteRefs(schema, refs)
  if (refs.size === 0 || !isSchemaNode(rewritten)) return schema
  const added: { [name: string]: JSONSchema } = {}
  for (const [name, target] of hoisted) {
    const node = rewriteRefs(target, refs)
    if (isSchemaNode(node)) added[name] = node
  }
  return { ...rewritten, [container]: { ...rewritten[container], ...added } }
}
