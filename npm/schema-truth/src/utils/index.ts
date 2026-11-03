import {
  DEFAULT_ROOT_NAME,
  DEFINITION_REF_PREFIXES,
  NON_IDENTIFIER_CHARACTER_PATTERN,
  OPENAPI_COMPONENT_SUFFIX_MAP,
} from '../constants/index.js'
import { isArrowExpression, isValidIdentifier } from '../guard/index.js'

export { OPENAPI_COMPONENT_SUFFIX_MAP } from '../constants/index.js'

/**
 * Convert string to PascalCase (first character uppercase).
 *
 * When the input contains characters that are not valid in a TypeScript
 * identifier (whitespace, dots, slashes, etc.) the input is routed through
 * {@link toIdentifierPascalCase} so the generated variable name remains
 * parseable. Hyphens and underscores are preserved for back-compat with
 * upstream titles that already generated working code.
 *
 * @example
 * ```ts
 * toPascalCase('animal')                     // 'Animal'
 * toPascalCase('userProfile')                // 'UserProfile'
 * toPascalCase('Self-Referencing Entities')  // 'SelfReferencingEntities'
 * ```
 */
export function toPascalCase(name: string) {
  if (NON_IDENTIFIER_CHARACTER_PATTERN.test(name)) return toIdentifierPascalCase(name)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Encode non-ASCII characters as `u<hex codepoint>` so they survive identifier
 * normalization instead of being stripped (which collapses every non-ASCII name
 * to the same `Schema`, producing duplicate declarations). Pure-ASCII input is
 * returned unchanged, so identifier generation stays byte-for-byte identical for
 * the overwhelming majority of specs.
 *
 * @example
 * ```ts
 * encodeNonAscii('User')          // 'User'
 * encodeNonAscii('日本語')         // 'u65e5u672cu8a9e'
 * ```
 */
export function encodeNonAscii(name: string) {
  // Iterating by code point is the point here: splitting a surrogate pair would encode
  // one character as two escapes.
  // oxlint-disable-next-line typescript/no-misused-spread -- code-point iteration is intended
  return [...name]
    .map((ch) => {
      const cp = ch.codePointAt(0) ?? 0
      return cp > 0x7f ? `u${cp.toString(16)}` : ch
    })
    .join('')
}

/**
 * Convert string to a valid PascalCase identifier.
 *
 * Splits by non-alphanumeric characters and capitalizes each segment.
 * Handles hyphens, underscores, dots, spaces, leading numbers, and non-ASCII characters.
 *
 * @example
 * ```ts
 * toIdentifierPascalCase('user-name')   // 'UserName'
 * toIdentifierPascalCase('hello_world') // 'HelloWorld'
 * toIdentifierPascalCase('123value')    // '_123Value'
 * toIdentifierPascalCase('user')        // 'User'
 * ```
 */
export function toIdentifierPascalCase(name: string) {
  const parts = encodeNonAscii(name)
    .split(/[^a-zA-Z0-9]+/u)
    .filter(Boolean)
  if (parts.length === 0) return DEFAULT_ROOT_NAME
  const result = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  if (/^[0-9]/u.test(result)) {
    const prefixed = `_${result}`
    return prefixed.replace(/([0-9])([a-z])/u, (_, d, c: string) => `${d}${c.toUpperCase()}`)
  }
  return result
}

export function normalizeTypes(t?: string | readonly string[]) {
  if (t === undefined) return []
  if (typeof t === 'string') return [t]
  return [...t]
}

/** The keywords of a schema node {@link coerceDefault} reads a `default` against. */
export type DefaultSchema = {
  readonly $ref?: string
  readonly type?: string | readonly string[]
  readonly nullable?: boolean
  readonly enum?: readonly unknown[]
  readonly const?: unknown
  readonly items?: DefaultSchema | readonly DefaultSchema[] | boolean
  readonly properties?: { readonly [key: string]: DefaultSchema }
  readonly required?: readonly string[]
  readonly additionalProperties?: boolean | object
  readonly patternProperties?: object
  readonly unevaluatedProperties?: boolean | object
  readonly allOf?: readonly DefaultSchema[]
  readonly oneOf?: readonly DefaultSchema[]
  readonly anyOf?: readonly DefaultSchema[]
}

type DefaultResult = { readonly keep: boolean; readonly value: unknown }

/**
 * Reconcile a schema's `default` value with the type the schema actually emits
 * so the generated `.default(...)` stays assignable. The default is kept only
 * when it is a value of the schema, read the way a document usually writes it:
 *
 * - `null` is kept only on a nullable schema (or one whose `enum` lists it).
 * - an `enum` / `const` takes only what it lists.
 * - text that spells a value of the schema's type is read as that value: `'true'`
 *   for a boolean, `'7'` for a number or an integer; a number or a boolean for a
 *   string is written as text. Any other scalar of the wrong type is dropped
 *   (`'null'` for an integer, `'strict'` with the quotes for an enum).
 * - an array keeps its items when every one is a value of `items`.
 * - an object default drops keys the schema does not declare, when the emitted
 *   object has no index signature (`additionalProperties` is not `true` or a
 *   schema, and there are no `patternProperties`), and needs every `required`
 *   key. A loose or record schema keeps every key.
 * - a `$ref`, or an `allOf` the node has no type of its own beside, is read as
 *   the definition it names when `definitions` has it; a `oneOf` / `anyOf` keeps
 *   the default when a member takes it, whatever `type` sits beside it.
 * - a node with nothing to check against (no `type`, an unknown `$ref`) keeps
 *   the default as written.
 *
 * JSON Schema 2020-12 §9.9.4.1 treats `default` as an annotation with no
 * validity guarantee, so an invalid one is dropped rather than reported.
 *
 * @example
 * ```ts
 * coerceDefault({ type: 'boolean' }, 'true')              // { keep: true, value: true }
 * coerceDefault({ type: 'number' }, '7')                  // { keep: true, value: 7 }
 * coerceDefault({ type: 'object' }, null)                 // { keep: false, value: null }
 * coerceDefault({ type: 'object', nullable: true }, null) // { keep: true, value: null }
 * coerceDefault({ type: 'array' }, 'eval')                // { keep: false, value: 'eval' }
 * coerceDefault({ enum: ['a', 'b'] }, "'a'")              // { keep: false, value: "'a'" }
 * ```
 */
export function coerceDefault(
  schema: DefaultSchema,
  value: unknown,
  definitions?: { readonly [name: string]: DefaultSchema },
): DefaultResult {
  return conformDefault(schema, value, definitions, new Set())
}

function conformDefault(
  schema: DefaultSchema,
  value: unknown,
  definitions: { readonly [name: string]: DefaultSchema } | undefined,
  // The references already being read: a cycle ends at the reference, as written.
  reading: ReadonlySet<string>,
): DefaultResult {
  const drop: DefaultResult = { keep: false, value }
  const asIs: DefaultResult = { keep: true, value }
  const conform = (s: DefaultSchema, v: unknown, r: ReadonlySet<string> = reading) =>
    conformDefault(s, v, definitions, r)
  if (schema.$ref !== undefined) {
    const target = reading.has(schema.$ref) ? undefined : definitionOf(schema.$ref, definitions)
    if (target === undefined) {
      return value === null && schema.nullable !== true ? drop : asIs
    }
    const { $ref, ...beside } = schema
    return conform({ ...target, ...beside }, value, new Set([...reading, $ref]))
  }
  const types = normalizeTypes(schema.type)
  const isNullable =
    schema.nullable === true ||
    types.includes('null') ||
    schema.enum?.includes(null) === true ||
    schema.const === null
  if (value === null) {
    if (isNullable) return asIs
    const members = [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]
    return members.some((member) => conform(member, null).keep) ? asIs : drop
  }
  // A union is emitted from its members, not from a `type` beside it.
  const members = schema.oneOf ?? schema.anyOf
  if (members !== undefined && members.length > 0) {
    const results = members.map((member) => conform(member, value))
    return (
      results.find((result) => result.keep && result.value === value) ??
      results.find((result) => result.keep) ??
      drop
    )
  }
  if (schema.enum !== undefined) {
    return schema.enum.some((member) => member === value) ? asIs : drop
  }
  if (schema.const !== undefined) {
    return JSON.stringify(schema.const) === JSON.stringify(value) ? asIs : drop
  }
  if (types.length === 0 && schema.allOf !== undefined) {
    // A `{ type: 'null' }` member only makes the node nullable, read above.
    const shaped = schema.allOf.filter((member) => {
      const memberTypes = normalizeTypes(member.type)
      return memberTypes.length === 0 || memberTypes.some((t) => t !== 'null')
    })
    return shaped.reduce<DefaultResult>(
      (result, member) => (result.keep ? conform(member, result.value) : result),
      asIs,
    )
  }
  const valueTypes = types.filter((t) => t !== 'null')
  // `type: 'null'` takes nothing but the `null` read above.
  if (types.length > 0 && valueTypes.length === 0) return drop
  if (valueTypes.length === 0) {
    return schema.properties !== undefined ? (readObject(schema, value, conform) ?? drop) : asIs
  }
  const read = (type: string): DefaultResult | undefined => {
    if (type === 'boolean') {
      if (typeof value === 'boolean') return asIs
      if (value === 'true' || value === 'false') return { keep: true, value: value === 'true' }
      return undefined
    }
    if (type === 'number' || type === 'integer') {
      const number =
        typeof value === 'number'
          ? value
          : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
            ? Number(value)
            : undefined
      if (number === undefined) return undefined
      if (type === 'integer' && !Number.isInteger(number)) return undefined
      return { keep: true, value: number }
    }
    if (type === 'string') {
      if (typeof value === 'string') return asIs
      if (typeof value === 'number' || typeof value === 'boolean') {
        return { keep: true, value: String(value) }
      }
      return undefined
    }
    if (type === 'array') {
      if (!Array.isArray(value)) return undefined
      const items = schema.items
      if (!isDefaultSchemaObject(items)) return asIs
      const readItems = value.map((item) => conform(items, item))
      return readItems.every((item) => item.keep)
        ? { keep: true, value: readItems.map((item) => item.value) }
        : undefined
    }
    if (type === 'object') return readObject(schema, value, conform)
    // `date`, or a type the generators do not know: taken as written.
    return asIs
  }
  // The type the value already is comes first, so `['string', 'boolean']` keeps `'true'`.
  const own = valueTypes.find(
    (type) => typeOf(value) === type || (type === 'number' && typeof value === 'number'),
  )
  return (
    (own === undefined ? undefined : read(own)) ??
    valueTypes.map(read).find((r) => r !== undefined) ??
    drop
  )
}

/** An object default as a value of the schema, or `undefined` when it is not one. */
function readObject(
  schema: DefaultSchema,
  value: unknown,
  conform: (schema: DefaultSchema, value: unknown) => DefaultResult,
): DefaultResult | undefined {
  if (!isDeclaredObject(value)) return undefined
  if (schema.properties === undefined || canHoldUndeclaredKeys(schema)) {
    return { keep: true, value }
  }
  const declared = schema.properties
  if ((schema.required ?? []).some((key) => !Object.hasOwn(value, key))) return undefined
  const kept: { [key: string]: unknown } = {}
  for (const [key, item] of Object.entries(value)) {
    if (!Object.hasOwn(declared, key)) continue
    const result = conform(declared[key], item)
    if (!result.keep) return undefined
    kept[key] = result.value
  }
  return { keep: true, value: kept }
}

/** The definition a local `$ref` names, when `definitions` has it. */
function definitionOf(
  ref: string,
  definitions: { readonly [name: string]: DefaultSchema } | undefined,
): DefaultSchema | undefined {
  if (definitions === undefined) return undefined
  for (const prefix of DEFINITION_REF_PREFIXES) {
    if (!ref.startsWith(prefix)) continue
    const rest = ref.slice(prefix.length)
    if (rest === '' || rest.includes('/')) return undefined
    const name = decodeURIComponent(rest)
    return Object.hasOwn(definitions, name) ? definitions[name] : undefined
  }
  return undefined
}

function typeOf(value: unknown): string | undefined {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  if (typeof value === 'string') return 'string'
  if (Array.isArray(value)) return 'array'
  if (isDeclaredObject(value)) return 'object'
  return undefined
}

function isDefaultSchemaObject(
  value: DefaultSchema | readonly DefaultSchema[] | boolean | undefined,
): value is DefaultSchema {
  return typeof value === 'object' && !Array.isArray(value)
}

function isDeclaredObject(value: unknown): value is { readonly [key: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether a generated object type accepts keys the schema does not name. */
function canHoldUndeclaredKeys(schema: {
  readonly additionalProperties?: boolean | object
  readonly patternProperties?: object
  readonly unevaluatedProperties?: boolean | object
}): boolean {
  if (schema.additionalProperties === true || typeof schema.additionalProperties === 'object') {
    return true
  }
  if (schema.patternProperties !== undefined) return true
  return schema.unevaluatedProperties === true || typeof schema.unevaluatedProperties === 'object'
}

/**
 * A message as the expression an emitted check evaluates for each issue: an arrow source
 * is applied to the issue, a sentence becomes a string literal.
 *
 * @example
 * ```ts
 * issueMessageExpression('Invalid')                  // '"Invalid"'
 * issueMessageExpression('(issue) => issue.path[0]') // '((issue) => issue.path[0])(issue)'
 * ```
 */
export function issueMessageExpression(message: string): string {
  return isArrowExpression(message) ? `(${message})(issue)` : JSON.stringify(message)
}

/**
 * Format an error message argument using the Zod v4 unified `error` parameter.
 *
 * @example
 * ```ts
 * zodError('Name must be 3-20 characters') // '{error:"Name must be 3-20 characters"}'
 * zodError('(val) => `Expected ${val}`')   // '{error:(val) => `Expected ${val}`}'
 * ```
 */
export function zodError(message: string) {
  return isArrowExpression(message) ? `{error:${message}}` : `{error:${JSON.stringify(message)}}`
}

/** `zodError(message)` as a trailing argument, or nothing when there is no message. */
export function zodErrorPart(message: string | undefined): string {
  return message ? `,${zodError(message)}` : ''
}

/**
 * Build the base `{error:...}` argument for a Zod v4 schema constructor when
 * `x-error-message` (type / generic) and/or `x-required-message`
 * (`issue.input === undefined`) are present.
 */
export function zodBaseError(
  typeMessage: string | undefined,
  requiredMessage: string | undefined,
): string {
  if (typeMessage === undefined && requiredMessage === undefined) return ''
  if (requiredMessage === undefined && typeMessage !== undefined) return zodError(typeMessage)
  if (requiredMessage !== undefined && typeMessage === undefined) {
    return `{error:(issue)=>issue.input===undefined?${JSON.stringify(requiredMessage)}:undefined}`
  }
  return `{error:(issue)=>issue.input===undefined?${JSON.stringify(requiredMessage)}:${JSON.stringify(typeMessage)}}`
}

/**
 * Format an error message argument for Valibot.
 *
 * @example
 * ```ts
 * valibotError('Must be valid')          // '"Must be valid"'
 * valibotError('(issue) => issue.input') // '(issue) => issue.input'
 * ```
 */
export function valibotError(message: string) {
  return isArrowExpression(message) ? message : JSON.stringify(message)
}

/** `valibotError(message)` as a trailing argument, or nothing when there is no message. */
export function valibotErrorPart(message: string | undefined): string {
  return message ? `,${valibotError(message)}` : ''
}

/**
 * Format an error message annotation for Effect Schema.
 *
 * Effect Schema v4 types the `message` annotation as a plain `string` (v3 took
 * a `() => string` thunk), so an arrow-expression message has no place to go
 * and is emitted as its source text — see {@link effectMessage}.
 *
 * @example
 * ```ts
 * effectError('Required') // '{message:"Required"}'
 * ```
 */
export function effectError(message: string) {
  return `{message:${effectMessage(message)}}`
}

/** `effectError(message)` as a trailing argument, or nothing when there is no message. */
export function effectErrorPart(message: string | undefined): string {
  return message ? `,${effectError(message)}` : ''
}

/**
 * The `message` annotation value for Effect Schema v4: a string literal.
 *
 * @example
 * ```ts
 * effectMessage('Required') // '"Required"'
 * ```
 */
export function effectMessage(message: string) {
  return JSON.stringify(message)
}

/**
 * Resolve an OpenAPI $ref string to a variable name with the appropriate suffix
 *
 * @example
 * ```ts
 * resolveOpenAPIRef('#/components/schemas/User')      // 'UserSchema'
 * resolveOpenAPIRef('#/components/parameters/UserId') // 'UserIdParamsSchema'
 * resolveOpenAPIRef('#/definitions/Address')          // null
 * ```
 */
export function resolveOpenAPIRef($ref: string) {
  for (const { prefix, suffix } of OPENAPI_COMPONENT_SUFFIX_MAP) {
    if ($ref.startsWith(prefix)) {
      const rawName = decodeURIComponent($ref.slice(prefix.length))
      return toIdentifierPascalCase(rawName) + suffix
    }
  }
  return null
}

/**
 * Encode a property key safely for object literal output.
 * Bare identifiers stay unquoted; everything else is JSON-encoded.
 *
 * @example
 * ```ts
 * makeSafeKey('foo')      // 'foo'
 * makeSafeKey('foo-bar')  // '"foo-bar"'
 * makeSafeKey('123')      // '"123"'
 * ```
 */
export function makeSafeKey(key: string): string {
  return isValidIdentifier(key) ? key : JSON.stringify(key)
}
