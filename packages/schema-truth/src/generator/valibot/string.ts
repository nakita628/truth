import { hasFixedLength } from '../../guard/index.js'
import { formatPattern } from '../../helper/format.js'
import { regexLiteral } from '../../helper/regex.js'
import type { JSONSchema } from '../../parser/index.js'
import { valibotError, valibotErrorPart } from '../../utils/index.js'

/** The formats Valibot checks with an action of its own, keyed by the lower-cased format. */
const FORMAT_ACTION: { readonly [k: string]: string } = {
  email: 'v.email()',
  emoji: 'v.emoji()',
  base64: 'v.base64()',
  nanoid: 'v.nanoid()',
  cuid2: 'v.cuid2()',
  ulid: 'v.ulid()',
  mac: 'v.mac()',
  hex: 'v.hexadecimal()',
  ipv4: 'v.ipv4()',
  ipv6: 'v.ipv6()',
  ip: 'v.ip()',
  uri: 'v.url()',
  url: 'v.url()',
  httpurl: 'v.url()',
  creditcard: 'v.creditCard()',
}

/** The formats that normalise the value rather than check it, keyed by the lower-cased format. */
const TRANSFORM_FORMATS: { readonly [k: string]: string } = {
  trim: 'v.trim()',
  tolowercase: 'v.toLowerCase()',
  touppercase: 'v.toUpperCase()',
}

/** An `http` / `https` URL, which `v.url()` alone does not require. */
const HTTP_URL_PATTERN = String.raw`/^https?:\/\//`

/**
 * The actions that check a string `format`: Valibot's own where it has one, otherwise the
 * regex every target shares. `[]` for a format with neither.
 */
function formatActions(schema: JSONSchema, format: string, errorArg: string): readonly string[] {
  const withError = (action: string) =>
    errorArg ? action.replace(/\(\)$/u, `(${errorArg})`) : action
  const action = FORMAT_ACTION[format]
  if (action !== undefined) {
    return format === 'httpurl'
      ? [withError(action), `v.regex(${HTTP_URL_PATTERN}${errorArg ? `,${errorArg}` : ''})`]
      : [withError(action)]
  }
  const pattern = formatPattern(schema, format)
  return pattern === undefined ? [] : [`v.regex(${pattern}${errorArg ? `,${errorArg}` : ''})`]
}

/**
 * The Valibot schema of a string node. `minLength` / `maxLength` count code points, as
 * JSON Schema does, so they are `v.minCodePoints` / `v.maxCodePoints` / `v.codePoints`
 * rather than `v.minLength`, which counts UTF-16 units, or `v.minGraphemes`, which
 * counts user-perceived characters.
 */
export function string(schema: JSONSchema) {
  const errorMessage = schema['x-error-message']
  // v3.0: x-required-message — for valibot, the base v.string(msg) covers both
  // type mismatch and missing-input semantics (v.optional handles undefined).
  // When only x-required-message is set, use it as the base error.
  const requiredMessage = schema['x-required-message']
  const baseErrorArg = errorMessage
    ? valibotError(errorMessage)
    : requiredMessage
      ? valibotError(requiredMessage)
      : ''
  const formatName = schema.format?.toLowerCase()
  // A `binary` string is a file, not text.
  if (formatName === 'binary') return errorMessage ? `v.file(${baseErrorArg})` : 'v.file()'
  const patternMessage = schema['x-pattern-message']
  const patternErrorPart = valibotErrorPart(patternMessage)
  const lengthMessage = schema['x-minLength-message'] ?? schema['x-maxLength-message']
  const lengthErrorPart = valibotErrorPart(lengthMessage)
  const minimumMessage = schema['x-minLength-message']
  const minErrorPart = valibotErrorPart(minimumMessage)
  const maximumMessage = schema['x-maxLength-message']
  const maxErrorPart = valibotErrorPart(maximumMessage)
  const format =
    formatName === undefined
      ? []
      : formatActions(schema, formatName, errorMessage ? baseErrorArg : '')
  const transformFormat = formatName === undefined ? undefined : TRANSFORM_FORMATS[formatName]
  const isFixedLength = hasFixedLength(schema)
  const trim = schema['x-trim'] === true || transformFormat === 'v.trim()' ? 'v.trim()' : undefined
  const toLowerCase =
    schema['x-toLowerCase'] === true || transformFormat === 'v.toLowerCase()'
      ? 'v.toLowerCase()'
      : undefined
  const toUpperCase =
    schema['x-toUpperCase'] === true || transformFormat === 'v.toUpperCase()'
      ? 'v.toUpperCase()'
      : undefined
  const normalize =
    typeof schema['x-normalize'] === 'string'
      ? `v.normalize(${JSON.stringify(schema['x-normalize'])})`
      : undefined
  const startsWith =
    typeof schema['x-startsWith'] === 'string'
      ? `v.startsWith(${JSON.stringify(schema['x-startsWith'])})`
      : undefined
  const endsWith =
    typeof schema['x-endsWith'] === 'string'
      ? `v.endsWith(${JSON.stringify(schema['x-endsWith'])})`
      : undefined
  const includes =
    typeof schema['x-includes'] === 'string'
      ? `v.includes(${JSON.stringify(schema['x-includes'])})`
      : undefined
  const actions = [
    trim,
    toLowerCase,
    toUpperCase,
    normalize,
    startsWith,
    endsWith,
    includes,
    ...format,
    schema.pattern ? `v.regex(${regexLiteral(schema.pattern)}${patternErrorPart})` : undefined,
    isFixedLength ? `v.codePoints(${schema.minLength}${lengthErrorPart})` : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `v.minCodePoints(${schema.minLength}${minErrorPart})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `v.maxCodePoints(${schema.maxLength}${maxErrorPart})`
      : undefined,
  ].filter((v) => v !== undefined)
  if (actions.length > 0) return `v.pipe(v.string(${baseErrorArg}),${actions.join(',')})`
  return errorMessage ? `v.string(${baseErrorArg})` : 'v.string()'
}
