import { ISO_4217_CURRENCY_CODES } from '../../constants/index.js'
import { hasFixedLength } from '../../guard/index.js'
import { timePattern } from '../../helper/format.js'
import { regexLiteral } from '../../helper/regex.js'
import type { JSONSchema } from '../../parser/index.js'
import { zodBaseError, zodErrorPart } from '../../utils/index.js'

/** The formats Zod checks with a top-level validator, keyed by the lower-cased format. */
const FORMAT_STRING: { readonly [k: string]: string } = {
  email: 'email()',
  guid: 'guid()',
  uuid: 'uuid()',
  uuidv4: 'uuidv4()',
  uuidv6: 'uuidv6()',
  uuidv7: 'uuidv7()',
  uri: 'url()',
  url: 'url()',
  httpurl: 'httpUrl()',
  hostname: 'hostname()',
  hex: 'hex()',
  e164: 'e164()',
  ksuid: 'ksuid()',
  xid: 'xid()',
  emoji: 'emoji()',
  base64: 'base64()',
  base64url: 'base64url()',
  nanoid: 'nanoid()',
  cuid: 'cuid()',
  cuid2: 'cuid2()',
  ulid: 'ulid()',
  ipv4: 'ipv4()',
  ipv6: 'ipv6()',
  mac: 'mac()',
  cidrv4: 'cidrv4()',
  cidrv6: 'cidrv6()',
  date: 'iso.date()',
  'date-time': 'iso.datetime()',
  duration: 'iso.duration()',
  binary: 'file()',
  jwt: 'jwt()',
}

/** The formats that normalise the value rather than check it, keyed by the lower-cased format. */
const TRANSFORM_FORMATS: { readonly [k: string]: string } = {
  trim: '.trim()',
  tolowercase: '.toLowerCase()',
  touppercase: '.toUpperCase()',
}

const LUHN_CHECK = `(val)=>{let sum=0;for(let i=0;i<val.length;i++){let digit=Number(val[val.length-1-i]);if(i%2===1){digit*=2;if(digit>9)digit-=9}sum+=digit}return sum%10===0}`

const IBAN_CHECK = `(val)=>{let rest=0;for(const char of val.slice(4)+val.slice(0,4)){const n=Number.parseInt(char,36);rest=(n>9?rest*100+n:rest*10+n)%97}return rest===1}`

/**
 * The checks chained onto `z.string()` for a format Zod has no validator of its own for,
 * or `undefined` when the format is not one of them.
 */
function formatChecks(schema: JSONSchema, format: string): string | undefined {
  const errorMessage = schema['x-error-message']
  const errorPart = zodErrorPart(errorMessage)
  // RFC 3339 `full-time` carries an offset, which `z.iso.time()` cannot express.
  if (format === 'time' && schema['x-isoOffset'] !== false) {
    const precision = schema['x-isoPrecision']
    return `.regex(${timePattern(typeof precision === 'number' ? precision : undefined, true)}${errorPart})`
  }
  if (format === 'creditcard') {
    return `${String.raw`.regex(/^\d{12,19}$/${errorPart})`}.refine(${LUHN_CHECK}${errorPart})`
  }
  if (format === 'iban') {
    return `${String.raw`.regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/${errorPart})`}.refine(${IBAN_CHECK}${errorPart})`
  }
  if (format === 'currencycode') {
    return `.regex(/^(?:${ISO_4217_CURRENCY_CODES.join('|')})$/${errorPart})`
  }
  return undefined
}

/** The Zod format call of a node, as `z.` would be followed by, or `undefined`. */
function formatCall(schema: JSONSchema, format: string): string | undefined {
  // `z.iso.time()` rejects an offset; it is only the right check once offsets are ruled out.
  if (format === 'time') return schema['x-isoOffset'] === false ? 'iso.time()' : undefined
  return FORMAT_STRING[format]
}

const EMAIL_PATTERN_MAP: { readonly [k: string]: string } = {
  html5: 'z.regexes.html5Email',
  rfc5322: 'z.regexes.rfc5322Email',
  browser: 'z.regexes.browserEmail',
  unicode: 'z.regexes.unicodeEmail',
}

function buildFormatOptions(schema: JSONSchema, format: string): readonly string[] {
  const parts: string[] = []
  if (format === 'email') {
    const emailPattern = schema['x-emailPattern']
    const emailRegex = schema['x-emailRegex']
    if (typeof emailPattern === 'string' && EMAIL_PATTERN_MAP[emailPattern] !== undefined) {
      parts.push(`pattern:${EMAIL_PATTERN_MAP[emailPattern]}`)
    } else if (typeof emailRegex === 'string') {
      parts.push(`pattern:${regexLiteral(emailRegex)}`)
    }
    return parts
  }
  if (format === 'uuid') {
    const uuidVersion = schema['x-uuidVersion']
    if (typeof uuidVersion === 'string') parts.push(`version:${JSON.stringify(uuidVersion)}`)
    return parts
  }
  if (format === 'uri' || format === 'url' || format === 'httpurl') {
    const urlProtocol = schema['x-urlProtocol']
    if (typeof urlProtocol === 'string') parts.push(`protocol:${regexLiteral(urlProtocol)}`)
    const urlHostname = schema['x-urlHostname']
    if (typeof urlHostname === 'string') parts.push(`hostname:${regexLiteral(urlHostname)}`)
    if (schema['x-urlNormalize'] === true) parts.push('normalize:true')
    else if (schema['x-urlNormalize'] === false) parts.push('normalize:false')
    return parts
  }
  if (format === 'date-time') {
    const precision = schema['x-isoPrecision']
    if (typeof precision === 'number') parts.push(`precision:${precision}`)
    // RFC 3339 `date-time` carries an offset, so one is accepted unless ruled out.
    const offset = schema['x-isoOffset']
    if (offset !== false) parts.push('offset:true')
    const local = schema['x-isoLocal']
    if (typeof local === 'boolean') parts.push(`local:${local}`)
    return parts
  }
  if (format === 'time') {
    const precision = schema['x-isoPrecision']
    if (typeof precision === 'number') parts.push(`precision:${precision}`)
    return parts
  }
  if (format === 'jwt') {
    const alg = schema['x-jwtAlg']
    if (typeof alg === 'string') parts.push(`alg:${JSON.stringify(alg)}`)
    return parts
  }
  if (format === 'mac') {
    const delimiter = schema['x-macDelimiter']
    if (typeof delimiter === 'string') parts.push(`delimiter:${JSON.stringify(delimiter)}`)
    return parts
  }
  return parts
}

function hashBase(schema: JSONSchema, baseErrorArg: string): string | undefined {
  if (schema.format !== 'hash') return undefined
  const algo = schema['x-hashAlg']
  if (algo === undefined) {
    return baseErrorArg ? `z.string(${baseErrorArg})` : 'z.string()'
  }
  const enc = schema['x-hashEnc']
  const errorPart = baseErrorArg ? baseErrorArg.slice(1, -1) : ''
  const opts = [
    enc !== undefined ? `enc:${JSON.stringify(enc)}` : undefined,
    errorPart || undefined,
  ].filter((v) => v !== undefined)
  const optsStr = opts.length > 0 ? `,{${opts.join(',')}}` : ''
  return `z.hash(${JSON.stringify(algo)}${optsStr})`
}

function mergeOptions(formatOptions: readonly string[], baseErrorArg: string): string {
  if (formatOptions.length === 0) return baseErrorArg
  const errorPart = baseErrorArg ? baseErrorArg.slice(1, -1) : ''
  const allParts = errorPart ? [...formatOptions, errorPart] : [...formatOptions]
  return `{${allParts.join(',')}}`
}

function stringbool(schema: JSONSchema): string | undefined {
  const flag = schema['x-stringbool']
  if (flag === undefined || flag === false) return undefined
  const opts = typeof flag === 'object' ? flag : {}
  const parts: string[] = []
  if (Array.isArray(opts.truthy)) {
    parts.push(`truthy:[${opts.truthy.map((s) => JSON.stringify(s)).join(',')}]`)
  }
  if (Array.isArray(opts.falsy)) {
    parts.push(`falsy:[${opts.falsy.map((s) => JSON.stringify(s)).join(',')}]`)
  }
  if (opts.case === 'sensitive' || opts.case === 'insensitive') {
    parts.push(`case:${JSON.stringify(opts.case)}`)
  }
  const error = opts.error ?? schema['x-error-message']
  if (typeof error === 'string') parts.push(`error:${JSON.stringify(error)}`)
  return parts.length === 0 ? 'z.stringbool()' : `z.stringbool({${parts.join(',')}})`
}

export function string(schema: JSONSchema) {
  const stringboolExpr = stringbool(schema)
  if (stringboolExpr !== undefined) return stringboolExpr
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const coerce = schema['x-coerce'] === true
  // coerce converts undefined → "undefined" (string success) before the error
  // handler runs, so issue.input === undefined is unreachable — drop x-required-message.
  const baseErrorArg = zodBaseError(errorMessage, coerce ? undefined : requiredMessage)
  const patternMessage = schema['x-pattern-message']
  const patternErrorPart = zodErrorPart(patternMessage)
  const minLengthMessage = schema['x-minLength-message']
  const minErrorPart = zodErrorPart(minLengthMessage)
  const maxLengthMessage = schema['x-maxLength-message']
  const maxErrorPart = zodErrorPart(maxLengthMessage)
  const fixedLengthMessage = minLengthMessage ?? maxLengthMessage
  const fixedLengthErrorPart = zodErrorPart(fixedLengthMessage)
  const hash = hashBase(schema, baseErrorArg)
  const formatName = schema.format?.toLowerCase()
  const format = formatName !== undefined ? formatCall(schema, formatName) : undefined
  const checks = formatName !== undefined ? formatChecks(schema, formatName) : undefined
  const transformFormat = formatName !== undefined ? TRANSFORM_FORMATS[formatName] : undefined
  const coercePrefix = coerce && !format && !hash ? 'coerce.' : ''
  const formatOptions =
    format && formatName !== undefined ? buildFormatOptions(schema, formatName) : []
  const baseCallArg = format ? mergeOptions(formatOptions, baseErrorArg) : baseErrorArg
  const formatBase =
    hash ?? (format ? `z.${format.replace(/\(\)$/u, `(${baseCallArg})`)}` : undefined)
  const pattern = schema.pattern
    ? `.regex(${regexLiteral(schema.pattern)}${patternErrorPart})`
    : undefined
  const isFixedLength = hasFixedLength(schema)
  const trim = schema['x-trim'] === true || transformFormat === '.trim()' ? '.trim()' : undefined
  const toLowerCase =
    schema['x-toLowerCase'] === true || transformFormat === '.toLowerCase()'
      ? '.toLowerCase()'
      : undefined
  const toUpperCase =
    schema['x-toUpperCase'] === true || transformFormat === '.toUpperCase()'
      ? '.toUpperCase()'
      : undefined
  const normalize =
    typeof schema['x-normalize'] === 'string'
      ? `.normalize(${JSON.stringify(schema['x-normalize'])})`
      : undefined
  const startsWith =
    typeof schema['x-startsWith'] === 'string'
      ? `.startsWith(${JSON.stringify(schema['x-startsWith'])})`
      : undefined
  const endsWith =
    typeof schema['x-endsWith'] === 'string'
      ? `.endsWith(${JSON.stringify(schema['x-endsWith'])})`
      : undefined
  const includes =
    typeof schema['x-includes'] === 'string'
      ? `.includes(${JSON.stringify(schema['x-includes'])})`
      : undefined
  const lowercaseValidate = schema['x-lowercase'] === true ? '.lowercase()' : undefined
  const uppercaseValidate = schema['x-uppercase'] === true ? '.uppercase()' : undefined
  const transforms = [trim, toLowerCase, toUpperCase, normalize]
    .filter((v) => v !== undefined)
    .join('')
  const restChecks = [
    checks,
    startsWith,
    endsWith,
    includes,
    pattern,
    isFixedLength ? `.length(${schema.minLength}${fixedLengthErrorPart})` : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `.min(${schema.minLength}${minErrorPart})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `.max(${schema.maxLength}${maxErrorPart})`
      : undefined,
    lowercaseValidate,
    uppercaseValidate,
  ]
    .filter((v) => v !== undefined)
    .join('')
  if (formatBase === undefined) {
    return `z.${coercePrefix}string(${baseCallArg})${transforms}${restChecks}`
  }
  // A top-level format validator checks the raw input before any chained transform runs,
  // so the value is normalised on a plain string first and handed to the format after.
  if (transforms !== '') {
    return `z.string(${baseErrorArg})${transforms}.pipe(${formatBase}${restChecks})`
  }
  return `${formatBase}${restChecks}`
}
