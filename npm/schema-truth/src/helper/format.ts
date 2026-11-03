import { DATE_PATTERN_SOURCE, FORMAT_PATTERNS, OFFSET_PATTERN_SOURCE } from '../constants/index.js'
import type { JSONSchema } from '../parser/index.js'

/** A regular expression as the literal that reproduces it in generated source. */
export function regexSource(pattern: RegExp): string {
  return `/${pattern.source}/${pattern.flags}`
}

/**
 * The source of an RFC 3339 `partial-time`. `precision` follows Zod's `z.iso.time`: `-1`
 * minutes only, `0` whole seconds, `n` exactly `n` fraction digits, and `undefined` any
 * number of them — with the seconds themselves optional unless `seconds` says otherwise.
 */
function timeSource(precision: number | undefined, seconds: boolean): string {
  const hhmm = String.raw`(?:[01]\d|2[0-3]):[0-5]\d`
  if (precision === undefined) {
    return seconds
      ? String.raw`${hhmm}:[0-5]\d(?:\.\d+)?`
      : String.raw`${hhmm}(?::[0-5]\d(?:\.\d+)?)?`
  }
  if (precision === -1) return hhmm
  if (precision === 0) return String.raw`${hhmm}:[0-5]\d`
  return String.raw`${hhmm}:[0-5]\d\.\d{${precision}}`
}

/** The regex literal of an RFC 3339 `full-date` that is a real calendar date. */
export function datePattern(): string {
  return `/^${DATE_PATTERN_SOURCE}$/`
}

/**
 * The regex literal of an RFC 3339 time: a `partial-time`, with the offset optional
 * unless `offset` is `false`, in which case none is accepted.
 */
export function timePattern(precision: number | undefined, offset: boolean): string {
  const tail = offset ? `${OFFSET_PATTERN_SOURCE}?` : ''
  return `/^${timeSource(precision, false)}${tail}$/`
}

/**
 * The regex literal of an RFC 3339 `date-time`, built as Zod's `z.iso.datetime()` builds
 * its own: a `Z` always, a numeric offset when `offset` is set, and an offset-less local
 * time when `local` is set.
 */
export function datetimePattern(options: {
  readonly precision: number | undefined
  readonly offset: boolean
  readonly local: boolean
}): string {
  const suffixes = ['Z', ...(options.offset ? [String.raw`([+-](?:[01]\d|2[0-3]):[0-5]\d)`] : [])]
  // RFC 3339 mandates the seconds wherever a `Z` or an offset follows; only the local
  // form may leave them out.
  const qualified = `${timeSource(options.precision, true)}(?:${suffixes.join('|')})`
  const time = options.local ? `${qualified}|${timeSource(options.precision, false)}` : qualified
  return `/^${DATE_PATTERN_SOURCE}T(?:${time})$/`
}

/**
 * The regex literal of an RFC 9562 UUID of `version`, or of any version — the nil and
 * max UUIDs included — when none is given.
 */
export function uuidPattern(version: number | undefined): string {
  if (version === undefined) {
    return '/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/'
  }
  return `/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$/`
}

/** The UUID version a format or an `x-uuidVersion` pins, or `undefined` for any. */
function uuidVersionOf(schema: JSONSchema, format: string): number | undefined {
  const named = /^uuidv(?<version>[1-8])$/u.exec(format)?.groups?.version
  if (named !== undefined) return Number(named)
  const extension = /^v(?<version>[1-8])$/u.exec(schema['x-uuidVersion'] ?? '')?.groups?.version
  return extension === undefined ? undefined : Number(extension)
}

/** The precision an `x-isoPrecision` pins, or `undefined` for any. */
function isoPrecisionOf(schema: JSONSchema): number | undefined {
  const precision = schema['x-isoPrecision']
  return typeof precision === 'number' ? precision : undefined
}

/**
 * The regex literal that checks a string `format` for a target without a validator of
 * its own for it, honouring `x-isoPrecision` / `x-isoOffset` / `x-isoLocal` on the ISO
 * formats and `x-uuidVersion` on `uuid`. `undefined` for a format with no pattern here.
 */
export function formatPattern(schema: JSONSchema, format: string): string | undefined {
  if (format === 'date') return datePattern()
  if (format === 'time') return timePattern(isoPrecisionOf(schema), schema['x-isoOffset'] !== false)
  if (format === 'date-time') {
    return datetimePattern({
      precision: isoPrecisionOf(schema),
      offset: schema['x-isoOffset'] !== false,
      local: schema['x-isoLocal'] === true,
    })
  }
  if (format === 'uuid' || /^uuidv[1-8]$/u.test(format)) {
    return uuidPattern(uuidVersionOf(schema, format))
  }
  const pattern = FORMAT_PATTERNS[format]
  return pattern === undefined ? undefined : regexSource(pattern)
}
