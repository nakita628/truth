import { hasFixedLength } from '../../guard/index.js'
import { formatPattern } from '../../helper/format.js'
import { regexLiteral } from '../../helper/regex.js'
import type { JSONSchema } from '../../parser/index.js'
import { effectError, effectErrorPart, effectMessage } from '../../utils/index.js'

/**
 * Formats whose Effect Schema v4 equivalent is a check on `Schema.String`.
 * v3 shipped `Schema.UUID` / `Schema.ULID` schemas; v4 expresses both as
 * filters instead.
 */
const FORMAT_CHECK: { readonly [k: string]: string } = {
  uuid: 'Schema.isUUID()',
  uuidv4: 'Schema.isUUID(4)',
  uuidv6: 'Schema.isUUID(6)',
  uuidv7: 'Schema.isUUID(7)',
  ulid: 'Schema.isULID()',
  base64: 'Schema.isBase64()',
  base64url: 'Schema.isBase64Url()',
  // A URL is whatever `URL` parses, as `z.url()` and `v.url()` read it.
  uri: 'Schema.makeFilter((input)=>URL.canParse(input))',
  url: 'Schema.makeFilter((input)=>URL.canParse(input))',
  httpurl: String.raw`Schema.makeFilter((input)=>URL.canParse(input)&&/^https?:\/\//.test(input))`,
}

/** The formats checked with a pattern of this generator's own. */
const FORMAT_PATTERN: { readonly [k: string]: string } = {
  email: 'Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/)',
}

/** The formats that normalise the value rather than check it, keyed by the lower-cased format. */
const TRANSFORM_FORMATS: { readonly [k: string]: string } = {
  trim: 'trim',
  tolowercase: 'toLowerCase',
  touppercase: 'toUpperCase',
}

/** The checks that verify a string `format`, or `[]` for a format with none here. */
function formatChecks(schema: JSONSchema, format: string, patternMessage: string | undefined) {
  const withMessage = (check: string) =>
    patternMessage ? check.replace(/\)$/u, `,${effectError(patternMessage)})`) : check
  const check = FORMAT_CHECK[format]
  if (check !== undefined) return [check]
  if (format === 'uuid' && typeof schema['x-uuidVersion'] === 'string') {
    return [`Schema.isUUID(${schema['x-uuidVersion'].slice(1)})`]
  }
  const own = FORMAT_PATTERN[format]
  if (own !== undefined) return [withMessage(own)]
  const pattern = formatPattern(schema, format)
  return pattern === undefined ? [] : [withMessage(`Schema.isPattern(${pattern})`)]
}

/**
 * The base string schema, applying any normalisation: `x-trim` / `x-toLowerCase` /
 * `x-toUpperCase` / `x-normalize` and the `trim` / `toLowerCase` / `toUpperCase`
 * formats. v4 keeps `Schema.Trim` but replaced the `Schema.Lowercase` /
 * `Schema.Uppercase` schemas with transformations that `Schema.decodeTo` applies to
 * `Schema.String`; a combination of them, or a Unicode normalisation, is one
 * transformation over the string.
 */
function stringBase(schema: JSONSchema, transformFormat: string | undefined): string {
  const steps = [
    schema['x-trim'] === true || transformFormat === 'trim' ? 'trim' : undefined,
    schema['x-toLowerCase'] === true || transformFormat === 'toLowerCase'
      ? 'toLowerCase'
      : undefined,
    schema['x-toUpperCase'] === true || transformFormat === 'toUpperCase'
      ? 'toUpperCase'
      : undefined,
    typeof schema['x-normalize'] === 'string'
      ? `normalize(${JSON.stringify(schema['x-normalize'])})`
      : undefined,
  ].filter((step) => step !== undefined)
  if (steps.length === 0) return 'Schema.String'
  if (steps.length === 1) {
    if (steps[0] === 'trim') return 'Schema.Trim'
    if (steps[0] === 'toLowerCase' || steps[0] === 'toUpperCase') {
      return `Schema.String.pipe(Schema.decodeTo(Schema.String,SchemaTransformation.${steps[0]}()))`
    }
  }
  const chain = steps.map((step) => (step.endsWith(')') ? `.${step}` : `.${step}()`)).join('')
  return `Schema.String.pipe(Schema.decodeTo(Schema.String,SchemaTransformation.transform({decode:(input)=>input${chain},encode:(output)=>output})))`
}

/** A count of characters, as the filter annotations spell it. */
function characters(count: number | undefined): string {
  return `${count} ${count === 1 ? 'character' : 'characters'}`
}

/** The annotations of a length filter: what it expects, and the message it reports. */
function lengthAnnotations(expected: string, message: string | undefined): string {
  const messagePart = message === undefined ? '' : `,message:${effectMessage(message)}`
  return `{expected:${JSON.stringify(expected)}${messagePart}}`
}

/**
 * The Effect schema of a string node. `minLength` / `maxLength` count code points, as
 * JSON Schema does, so a filter over `[...input]` stands in for `Schema.isMinLength`,
 * which counts UTF-16 units.
 */
export function string(schema: JSONSchema) {
  // v3.0: x-required-message falls back to base annotation when no
  // x-error-message; Effect Schema has no native required dispatch.
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const annotate = (code: string): string =>
    errorMessage ? `${code}.annotate(${effectError(errorMessage)})` : code
  const formatName = schema.format?.toLowerCase()
  // A `binary` string is a file, not text.
  if (formatName === 'binary') return annotate('Schema.instanceOf(File)')
  const patternMessage = schema['x-pattern-message']
  const patternErrorPart = effectErrorPart(patternMessage)
  const lengthMessage = schema['x-minLength-message'] ?? schema['x-maxLength-message']
  const minimumMessage = schema['x-minLength-message']
  const maximumMessage = schema['x-maxLength-message']
  const isFixedLength = hasFixedLength(schema)
  const startsWith =
    typeof schema['x-startsWith'] === 'string'
      ? `Schema.isStartsWith(${JSON.stringify(schema['x-startsWith'])})`
      : undefined
  const endsWith =
    typeof schema['x-endsWith'] === 'string'
      ? `Schema.isEndsWith(${JSON.stringify(schema['x-endsWith'])})`
      : undefined
  const includes =
    typeof schema['x-includes'] === 'string'
      ? `Schema.isIncludes(${JSON.stringify(schema['x-includes'])})`
      : undefined
  const lengthChecks = [
    startsWith,
    endsWith,
    includes,
    schema.pattern
      ? `Schema.isPattern(${regexLiteral(schema.pattern)}${patternErrorPart})`
      : undefined,
    isFixedLength
      ? `Schema.makeFilter((input)=>[...input].length===${schema.minLength},${lengthAnnotations(`a string of ${characters(schema.minLength)}`, lengthMessage)})`
      : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `Schema.makeFilter((input)=>[...input].length>=${schema.minLength},${lengthAnnotations(`a string of at least ${characters(schema.minLength)}`, minimumMessage)})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `Schema.makeFilter((input)=>[...input].length<=${schema.maxLength},${lengthAnnotations(`a string of at most ${characters(schema.maxLength)}`, maximumMessage)})`
      : undefined,
  ].filter((v) => v !== undefined)
  const checks = [
    ...(formatName === undefined ? [] : formatChecks(schema, formatName, patternMessage)),
    ...lengthChecks,
  ]
  const base = stringBase(
    schema,
    formatName === undefined ? undefined : TRANSFORM_FORMATS[formatName],
  )
  return annotate(checks.length > 0 ? `${base}.check(${checks.join(',')})` : base)
}
