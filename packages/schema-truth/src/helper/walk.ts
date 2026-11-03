import { isDefinitionKeyword, isRecord } from '../guard/index.js'

/** What a walk descends into, and what it yields. */
export type WalkOptions = {
  /** Leave `definitions` / `$defs` alone: only the body of each node is walked. */
  readonly skipDefinitions?: boolean
  /** Descend into the root without yielding it. */
  readonly skipRoot?: boolean
  /** A node the walk yields but does not descend into. */
  readonly prune?: (node: { readonly [k: string]: unknown }) => boolean
}

/**
 * Every object node under `root`, depth first, the root first.
 *
 * Arrays are descended into but never yielded: a combinator list is a list of schemas,
 * not a schema. This is the one traversal every "does the document contain ..." question
 * is asked through, so the questions stay one line each and agree on what a node is.
 *
 * @yields each object node, parents before children
 */
export function* walkSchema(
  root: unknown,
  options?: WalkOptions,
): Generator<{ readonly [k: string]: unknown }, undefined, undefined> {
  const stack: unknown[] = [root]
  let isRoot = true
  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item)
      continue
    }
    const yielded = !(isRoot && options?.skipRoot === true)
    isRoot = false
    if (yielded) {
      yield node
      if (options?.prune?.(node) === true) continue
    }
    for (const [key, value] of Object.entries(node)) {
      if (options?.skipDefinitions === true && isDefinitionKeyword(key)) continue
      if (isRecord(value)) stack.push(value)
    }
  }
  return undefined
}

/** Whether any node under `root` carries one of `keywords`. */
export function hasKeyword(root: unknown, keywords: readonly string[]): boolean {
  for (const node of walkSchema(root)) {
    if (keywords.some((keyword) => keyword in node)) return true
  }
  return false
}

/**
 * Whether a schema (at any depth) uses the JSON Schema conditional keywords
 * (`if` / `then` / `else`), so a generator that drops them can leave a marker.
 */
export function hasIfThenElse(schema: unknown): boolean {
  return hasKeyword(schema, ['if', 'then', 'else'])
}

/**
 * Whether a schema (at any depth) uses the JSON Schema `not` keyword. The TypeBox
 * generator falls back to `Type.Any()` because TypeBox v1 has no runtime `Type.Not(...)`
 * and `Value.Check` does not evaluate `not`.
 */
export function hasNotKeyword(schema: unknown): boolean {
  return hasKeyword(schema, ['not'])
}
