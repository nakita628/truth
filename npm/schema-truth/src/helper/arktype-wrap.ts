import { isArktypeDefinition, isNullable, isQuoted } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { readCodeExtension } from './code-extensions.js'
import type { CodeExtensionOptions } from './code-extensions.js'

/**
 * The most members a string-DSL union of string literals (`"'a' | 'b' | ..."`) may have.
 * ArkType parses the string at the type level, and a longer union exceeds TypeScript's
 * instantiation depth (TS2589), so a longer one is written another way.
 */
const ARKTYPE_STRING_UNION_LIMIT = 16

/**
 * The most members a string-DSL union may have when one of them is not a string literal
 * (`null`, a number, a keyword such as `string`): such a union exceeds TypeScript's
 * instantiation depth sooner, at 13 members.
 */
const ARKTYPE_MIXED_UNION_LIMIT = 12

/** A string-DSL member that is one string literal. */
const DSL_STRING_LITERAL_PATTERN = /^'[^'\\]*'$/u

/** The most members a string-DSL union of `members` may have. */
export function arktypeUnionLimit(members: readonly string[]) {
  return members.every((member) => DSL_STRING_LITERAL_PATTERN.test(member))
    ? ARKTYPE_STRING_UNION_LIMIT
    : ARKTYPE_MIXED_UNION_LIMIT
}

/**
 * The top-level members of a string-DSL definition (its text without the outer quotes):
 * the text split at each ` | ` outside a quoted literal (where a backslash escapes the next
 * character) and outside brackets.
 */
export function dslUnionMembers(definition: string) {
  return dslSplit(definition, ' | ')
}

/**
 * A string-DSL definition (its text without the outer quotes) as one operand: in
 * parentheses when it has a top-level `|`, or an `&` too where `withIntersection` says
 * the operator around it binds tighter than `&` (`[]`). `[]` applies only to the operand
 * right before it and `&` binds tighter than `|`, so `'a' | 'b'[]` reads as
 * `'a' | ('b'[])`.
 */
export function dslOperand(definition: string, withIntersection = false) {
  const grouped =
    dslSplit(definition, ' | ').length > 1 ||
    (withIntersection && dslSplit(definition, ' & ').length > 1)
  return grouped ? `(${definition})` : definition
}

/** The definition split at each `separator` outside a quoted literal and outside brackets. */
function dslSplit(definition: string, separator: string) {
  const members: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < definition.length; i += 1) {
    const char = definition[i]
    if (quote !== '') {
      if (char === '\\') i += 1
      else if (char === quote) quote = ''
    } else if (char === "'" || char === '"') {
      quote = char
    } else if (char === '(' || char === '[' || char === '{') {
      depth += 1
    } else if (char === ')' || char === ']' || char === '}') {
      depth -= 1
    } else if (depth === 0 && definition.startsWith(separator, i)) {
      members.push(definition.slice(start, i))
      start = i + separator.length
      i += separator.length - 1
    }
  }
  members.push(definition.slice(start))
  return members
}

/**
 * A definition a callback checks values against at validation time. Inside
 * `scope({...})` it goes through the scope (bound to `$`), which resolves the aliases
 * it may name; the global `type(...)` cannot. An expression that already evaluates to a
 * `Type` is used as it is.
 */
export function callbackType(source: string, scopeMode: boolean) {
  if (scopeMode) return isArktypeDefinition(source) ? `$.type(${source})` : source
  return isQuoted(source) ? `type(${source})` : source
}

/**
 * A callback that reaches the scope through `$`: its return type is spelled out, since
 * `$` is still being declared where the callback is written and TypeScript would
 * otherwise infer the scope's type from itself.
 */
export function callbackReturn(params: string, body: string) {
  return `${params}${body.includes('$.type(') ? ': boolean' : ''} => ${body}`
}

/**
 * Options accepted by {@link arktypeWrap}.
 *
 * `scopeMode` marks output that is being emitted inside `scope({...})`. There,
 * a definition may name a scope-local alias (`"Member"`, `"Member[]"`), which
 * only the scope can resolve — passing it to the global `type(...)` is a type
 * error. Scope mode therefore composes with ArkType's tuple expressions
 * (`[def, "@", text]`, `[def, "|", "null"]`), which stay in definition syntax
 * and so resolve against the scope.
 */
export type ArktypeWrapOptions = CodeExtensionOptions & {
  /**
   * The expression is the `null` schema itself (a `type: 'null'` node): nullability adds
   * nothing to it, so it is not wrapped a second time.
   */
  readonly nullSchema?: boolean
  readonly scopeMode?: boolean
}

/**
 * `inner` read after `readers`, each a `(data) => ...` arrow over the raw value: a morph
 * from `input` that pipes into `inner`, with `.to()` for a bare definition.
 */
export function arktypePreprocess(
  readers: readonly string[],
  inner: string,
  input: 'unknown' | 'object' = 'unknown',
) {
  if (readers.length === 0) return inner
  if (isArktypeDefinition(inner)) {
    return `type("${input}").pipe(${readers.join(',')}).to(${inner})`
  }
  return `type("${input}").pipe(${readers.join(',')},${inner})`
}

/**
 * Wraps an ArkType schema string with `.or("null")`, `.brand()` and
 * `.describe()` based on the JSON Schema's `nullable` / `x-brand` fields and
 * OpenAPI `description`.
 *
 * Metadata mapping (ArkType `.describe()`):
 * - `description` → `.describe(text)`, or `[def, "@", text]` in scope mode
 *
 * Other OpenAPI metadata fields (`examples`, `deprecated`, `externalDocs`,
 * `readOnly`, `writeOnly`) are NOT emitted because ArkType's `.configure()`
 * requires `ArkEnv["meta"]` interface augmentation for non-standard keys,
 * which the user must opt in to. Emitting them here could produce TypeScript
 * compile errors in consumer projects.
 *
 * @see https://arktype.io/docs/configuration
 */
export function arktypeWrap(arktypeStr: string, schema: JSONSchema, options?: ArktypeWrapOptions) {
  const inScope = options?.scopeMode === true
  const isDefinition = isArktypeDefinition
  // A quoted definition takes the string-union shortcut instead of `.or`, unless the
  // union with `null` would be too long for the string DSL.
  const withNullable =
    isNullable(schema) && options?.nullSchema !== true
      ? isQuoted(arktypeStr) &&
        dslUnionMembers(arktypeStr.slice(1, -1)).length < ARKTYPE_MIXED_UNION_LIMIT
        ? `"${arktypeStr.slice(1, -1)} | null"`
        : inScope && isDefinition(arktypeStr)
          ? `[${arktypeStr},"|","null"]`
          : `type(${arktypeStr}).or("null")`
      : arktypeStr
  const withReadonly =
    schema['x-readonly'] === true
      ? isDefinition(withNullable)
        ? `type(${withNullable}).readonly()`
        : `${withNullable}.readonly()`
      : withNullable
  const brand = schema['x-brand']
  const withBrand =
    typeof brand === 'string'
      ? isDefinition(withReadonly)
        ? `type(${withReadonly}).brand("${brand}")`
        : `${withReadonly}.brand("${brand}")`
      : withReadonly

  const narrow = readCodeExtension(schema, 'x-narrow', options)
  const morph = readCodeExtension(schema, 'x-morph', options)
  const pipeExt = readCodeExtension(schema, 'x-pipe', options)
  const codeChain = [narrow, morph, pipeExt].filter((v): v is string => v !== undefined).join('')
  const withCodeExts = codeChain
    ? isDefinition(withBrand)
      ? `type(${withBrand})${codeChain}`
      : `${withBrand}${codeChain}`
    : withBrand
  if (schema.description === undefined) return withCodeExts
  const text = JSON.stringify(schema.description)
  if (inScope && isDefinition(withCodeExts)) return `[${withCodeExts},"@",${text}]`
  const callable = isDefinition(withCodeExts) ? `type(${withCodeExts})` : withCodeExts
  return `${callable}.describe(${text})`
}
