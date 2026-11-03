import { hasFixedLength, isQuoted } from '../../guard/index.js'
import { formatPattern } from '../../helper/format.js'
import { regexLiteral } from '../../helper/regex.js'
import type { JSONSchema } from '../../parser/index.js'

/** The formats ArkType checks with a keyword of its own, keyed by the lower-cased format. */
const FORMAT_KEYWORD: { readonly [k: string]: string } = {
  email: 'string.email',
  uuid: 'string.uuid',
  uuidv4: 'string.uuid.v4',
  uuidv6: 'string.uuid.v6',
  uuidv7: 'string.uuid.v7',
  url: 'string.url',
  uri: 'string.url',
  ipv4: 'string.ip.v4',
  ipv6: 'string.ip.v6',
  ip: 'string.ip',
  base64: 'string.base64',
  base64url: 'string.base64.url',
  hex: 'string.hex',
  creditcard: 'string.creditCard',
}

/** The formats that normalise the value rather than check it: ArkType's morph keywords. */
const TRANSFORM_KEYWORD: { readonly [k: string]: string } = {
  trim: 'string.trim',
  tolowercase: 'string.lower',
  touppercase: 'string.upper',
}

/** An `http` / `https` URL, which `string.url` alone does not require. */
const HTTP_URL_PATTERN = String.raw`/^https?:\/\//`

/** The definition checking a string `format`: a keyword, a pattern, or `"string"` for none. */
function formatDefinition(schema: JSONSchema, format: string | undefined): string {
  if (format === undefined) return '"string"'
  if (format === 'binary') return '"File"'
  if (format === 'httpurl') return `type("string.url").and(${HTTP_URL_PATTERN})`
  if (format === 'uuid' && typeof schema['x-uuidVersion'] === 'string') {
    return `"string.uuid.${schema['x-uuidVersion']}"`
  }
  const keyword = FORMAT_KEYWORD[format]
  if (keyword !== undefined) return `"${keyword}"`
  const pattern = formatPattern(schema, format)
  return pattern === undefined ? '"string"' : `type(${pattern})`
}

/** A count of characters, as the predicate messages spell it. */
function characters(count: number | undefined): string {
  return `${count} ${count === 1 ? 'character' : 'characters'}`
}

/** `expr` validated against `definition` after its morphs: `.to()` for a definition, `.pipe()` for a type. */
function validateWith(expr: string, definition: string): string {
  return isQuoted(definition) ? `${expr}.to(${definition})` : `${expr}.pipe(${definition})`
}

/**
 * The ArkType definition of a string node. A transform — `x-trim`, `format: trim` and
 * their siblings — is a morph keyword the format and the checks follow, so the value is
 * normalised before it is checked. `minLength` / `maxLength` count code points, as JSON
 * Schema does, so a narrow over `[...data]` stands in for the `string >= n` DSL, which
 * counts UTF-16 units.
 */
export function string(schema: JSONSchema) {
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''
  const lengthMessage = schema['x-minLength-message'] ?? schema['x-maxLength-message']
  const minLengthMessage = schema['x-minLength-message']
  const maxLengthMessage = schema['x-maxLength-message']
  const patternMessage = schema['x-pattern-message']

  const formatName = schema.format?.toLowerCase()
  const transformFormat = formatName === undefined ? undefined : TRANSFORM_KEYWORD[formatName]
  const transforms = [
    schema['x-trim'] === true || transformFormat === 'string.trim' ? 'string.trim' : undefined,
    schema['x-toLowerCase'] === true || transformFormat === 'string.lower'
      ? 'string.lower'
      : undefined,
    schema['x-toUpperCase'] === true || transformFormat === 'string.upper'
      ? 'string.upper'
      : undefined,
    typeof schema['x-normalize'] === 'string'
      ? `string.normalize.${schema['x-normalize']}`
      : undefined,
  ].filter((t) => t !== undefined)
  const format = formatDefinition(schema, transformFormat === undefined ? formatName : undefined)
  const hasMorph = transforms.length > 0
  // After a morph the checks apply to its output, so a pattern is validated with `.to()`
  // rather than intersected into the input.
  const constrain = (expr: string, pattern: string): string =>
    hasMorph ? `${expr}.to(${pattern})` : `${expr}.and(${pattern})`

  const narrows: string[] = []
  if (schema.pattern && patternMessage) {
    narrows.push(
      `.narrow((data, ctx) => new RegExp(${JSON.stringify(schema.pattern)}).test(data) || ctx.mustBe(${JSON.stringify(patternMessage)}))`,
    )
  }
  if (hasFixedLength(schema)) {
    const msg = lengthMessage ?? `exactly ${characters(schema.minLength)}`
    narrows.push(
      `.narrow((data, ctx) => [...data].length === ${schema.minLength} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  } else {
    if (schema.minLength !== undefined) {
      const msg = minLengthMessage ?? errorMessage ?? `at least ${characters(schema.minLength)}`
      narrows.push(
        `.narrow((data, ctx) => [...data].length >= ${schema.minLength} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (schema.maxLength !== undefined) {
      const msg = maxLengthMessage ?? errorMessage ?? `at most ${characters(schema.maxLength)}`
      narrows.push(
        `.narrow((data, ctx) => [...data].length <= ${schema.maxLength} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
  }
  if (typeof schema['x-startsWith'] === 'string') {
    const prefix = schema['x-startsWith']
    narrows.push(
      `.narrow((data: string, ctx) => data.startsWith(${JSON.stringify(prefix)}) || ctx.mustBe(${JSON.stringify(`must start with ${JSON.stringify(prefix)}`)}))`,
    )
  }
  if (typeof schema['x-endsWith'] === 'string') {
    const suffix = schema['x-endsWith']
    narrows.push(
      `.narrow((data: string, ctx) => data.endsWith(${JSON.stringify(suffix)}) || ctx.mustBe(${JSON.stringify(`must end with ${JSON.stringify(suffix)}`)}))`,
    )
  }
  if (typeof schema['x-includes'] === 'string') {
    const sub = schema['x-includes']
    narrows.push(
      `.narrow((data: string, ctx) => data.includes(${JSON.stringify(sub)}) || ctx.mustBe(${JSON.stringify(`must include ${JSON.stringify(sub)}`)}))`,
    )
  }

  // The morphs first, then the format they feed, then the pattern and the narrows.
  const morphed = transforms.reduce<string | undefined>(
    (acc, t) => (acc === undefined ? `type("${t}")` : `${acc}.to("${t}")`),
    undefined,
  )
  const based =
    morphed === undefined ? format : format === '"string"' ? morphed : validateWith(morphed, format)
  const patterned =
    schema.pattern && !patternMessage
      ? constrain(isQuoted(based) ? `type(${based})` : based, regexLiteral(schema.pattern))
      : based
  if (narrows.length === 0 && !errorMessage) return patterned
  const runtime = isQuoted(patterned) ? `type(${patterned})` : patterned
  return `${runtime}${narrows.join('')}${describe}`
}
