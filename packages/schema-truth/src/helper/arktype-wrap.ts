import { isArktypeDefinition, isNullable, isQuoted } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { readCodeExtension } from './code-extensions.js'
import type { CodeExtensionOptions } from './code-extensions.js'

/**
 * A definition a callback checks values against at validation time. Inside
 * `scope({...})` it goes through the scope (bound to `$`), which resolves the aliases
 * it may name; the global `type(...)` cannot. An expression that already evaluates to a
 * `Type` is used as it is.
 */
export function callbackType(source: string, scopeMode: boolean): string {
  if (scopeMode) return isArktypeDefinition(source) ? `$.type(${source})` : source
  return isQuoted(source) ? `type(${source})` : source
}

/**
 * A callback that reaches the scope through `$`: its return type is spelled out, since
 * `$` is still being declared where the callback is written and TypeScript would
 * otherwise infer the scope's type from itself.
 */
export function callbackReturn(params: string, body: string): string {
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
): string {
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
export function arktypeWrap(
  arktypeStr: string,
  schema: JSONSchema,
  options?: ArktypeWrapOptions,
): string {
  const inScope = options?.scopeMode === true
  const isDefinition = isArktypeDefinition
  // A quoted definition takes the string-union shortcut instead of `.or`.
  const withNullable = isNullable(schema)
    ? isQuoted(arktypeStr)
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
