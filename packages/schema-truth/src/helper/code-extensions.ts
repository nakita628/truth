import { ALL_CODE_EXTENSION_KEYS } from '../constants/index.js'
import type { JSONSchema, XExtCode } from '../parser/index.js'
import { walkSchema } from './walk.js'

/** A code-emitting extension: one of the keys of `XExtCode`. */
export type CodeExtensionKey = keyof XExtCode

const CODE_EXTENSION_KEYS: ReadonlySet<string> = new Set(ALL_CODE_EXTENSION_KEYS)

const DENYLIST_PATTERN = new RegExp(
  [
    '\\b(?:process|require|import|globalThis|eval|Function|constructor|__proto__|',
    'child_process|setTimeout|setInterval|XMLHttpRequest|fetch|atob|btoa|',
    'document|window|self|top|parent|location|navigator|localStorage|',
    'sessionStorage|indexedDB|WebSocket|FileReader|Worker|crypto|require_|',
    'arguments|callee|caller|Reflect|Proxy|Symbol)\\b',
    '|String\\s*\\.\\s*fromCharCode',
    '|String\\s*\\.\\s*raw',
    '|\\.\\s*join\\s*\\(',
    '|`',
    '|\\\\[uxN]',
    '|\\[\\s*[\'"]',
  ].join(''),
  'u',
)

/**
 * Validate a raw code-extension value against a small denylist.
 *
 * **This is defense-in-depth only — not a primary control.** The primary
 * security control is the `unsafeCodeExtensions: true` programmatic opt-in
 * itself. A motivated attacker can bypass the denylist through string-
 * construction (`String.fromCharCode(...)`, `['c','o','d','e'].join('')`),
 * `arguments.callee.caller` chains, ES2015+ identifier characters, or any
 * number of metaprogramming patterns we have not enumerated. Do not pass
 * `{ unsafeCodeExtensions: true }` for JSON Schemas from outside your trust
 * boundary, regardless of what this function returns.
 *
 * Blocks: `process` / `require` / `import` / `globalThis` / `eval` /
 * `Function` / `constructor` / `__proto__` / `child_process` /
 * `arguments` / `callee` / `caller` / `Reflect` / `Proxy` / `Symbol`,
 * network and browser globals, `String.fromCharCode` and `String.raw`,
 * any `.join(` invocation, template-literal backticks,
 * unicode/hex/octal-name escape sequences, and `[ '...' ]` computed access.
 */
export function isSafeCodeExtension(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return !DENYLIST_PATTERN.test(value)
}

/**
 * Returns the list of code-extension keys present on a schema (any nested
 * level), so callers can emit a single warning when programmatic callers
 * supply such schemas without `unsafeCodeExtensions: true`.
 */
export function findCodeExtensionKeysInSchema(schema: JSONSchema): readonly string[] {
  const found = new Set<string>()
  for (const node of walkSchema(schema)) {
    for (const key of Object.keys(node)) {
      if (CODE_EXTENSION_KEYS.has(key)) found.add(key)
    }
  }
  return [...found]
}

export type CodeExtensionOptions = {
  readonly unsafeCodeExtensions?: boolean
}

/**
 * Read a code-extension value from the schema only when the flag is enabled
 * AND the value passes the denylist check. Returns `undefined` otherwise.
 */
export function readCodeExtension(
  schema: JSONSchema,
  key: CodeExtensionKey,
  options: CodeExtensionOptions | undefined,
): string | undefined {
  if (options?.unsafeCodeExtensions !== true) return undefined
  const raw = schema[key]
  if (typeof raw !== 'string') return undefined
  if (!isSafeCodeExtension(raw)) return undefined
  return raw
}
