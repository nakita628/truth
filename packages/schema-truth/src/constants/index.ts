/**
 * The values the generators agree on: every list of literals, every prefix and every
 * pattern that more than one module reads. Types that mirror a list are derived from it in
 * `parser/index.ts`, so adding a member here is the whole change.
 */

/**
 * The `type` values a JSON Schema node may carry, in the order the specification lists
 * them. `date` is not a JSON Schema type: it is the extension the generators accept for a
 * `Date`-typed value (Zod `z.date()`, Valibot `v.date()`).
 *
 * @see https://json-schema.org/understanding-json-schema/reference/type
 */
export const JSON_SCHEMA_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'object',
  'null',
  'date',
] as const

/**
 * The `format` values a string node may carry: the JSON Schema built-ins, the OpenAPI
 * data-type formats, and the names the target libraries add (`uuidv7`, `cuid2`, `jwt`,
 * `hash`, ...). A format a target has no equivalent for is a no-op there.
 *
 * @see https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 * @see https://zod.dev/api#strings
 */
export const STRING_FORMATS = [
  // JSON Schema built-ins
  'date-time',
  'date',
  'time',
  'duration',
  'email',
  'idn-email',
  'hostname',
  'idn-hostname',
  'ipv4',
  'ipv6',
  'uri',
  'uri-reference',
  'iri',
  'iri-reference',
  'uuid',
  'uri-template',
  'json-pointer',
  'relative-json-pointer',
  'regex',
  // OpenAPI 3.0 data types
  'binary',
  'byte',
  'password',
  // Library extensions (Zod-aligned names)
  'url',
  'httpUrl',
  'uuidv4',
  'uuidv6',
  'uuidv7',
  'guid',
  'emoji',
  'base64',
  'base64url',
  'hex',
  'nanoid',
  'cuid',
  'cuid2',
  'ulid',
  'ksuid',
  'xid',
  'ip',
  'cidrv4',
  'cidrv6',
  'mac',
  'jwt',
  'hash',
  'e164',
  'creditCard',
  'iban',
  'currencyCode',
  // Lower-case spellings of the names above, as some documents write them
  'httpurl',
  'creditcard',
  'currencycode',
  // Transform formats: the value is normalised rather than checked
  'toLowerCase',
  'toUpperCase',
  'trim',
  'slugify',
] as const

/**
 * The `format` values a numeric node may carry: the OpenAPI data-type formats plus the
 * widths the target libraries distinguish (`int32`, `float32`, `bigint`, ...).
 *
 * @see https://spec.openapis.org/oas/v3.1.0#data-types
 */
export const NUMBER_FORMATS = [
  'int32',
  'uint32',
  'int64',
  'uint64',
  'bigint',
  'float',
  'float32',
  'float64',
  'double',
  'decimal',
] as const

/**
 * The `contentEncoding` values of a string node.
 *
 * @see https://json-schema.org/draft/2020-12/json-schema-validation#section-8.3
 */
export const CONTENT_ENCODINGS = [
  'base64',
  'base64url',
  'binary',
  '7bit',
  '8bit',
  'quoted-printable',
] as const

/**
 * The OpenAPI parameter locations, plus `formData` for the fields of an
 * `application/x-www-form-urlencoded` or `multipart/form-data` body. Every one of them is
 * string-wire: a primitive schema emitted under one of them is coerced from a string.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#parameter-object
 */
export const PARAM_LOCATIONS = ['query', 'path', 'header', 'cookie', 'formData'] as const

/** The parameter locations whose values arrive as strings and are coerced. */
export const STRING_WIRE_LOCATIONS = ['query', 'path', 'header', 'cookie', 'formData'] as const

/**
 * The `type` values a value on the wire is coerced to, in the order a union tries them:
 * the text `1` is an integer before it is a number, and a string last of all.
 */
export const WIRE_PRIMITIVE_ORDER = ['integer', 'number', 'boolean', 'string'] as const

/**
 * The spellings of a boolean on the wire, as Zod's `z.stringbool()` reads them: `true`,
 * `1`, `yes`, `on`, `y`, `enabled` and their opposites, in any case.
 */
export const STRINGBOOL_PATTERN = /^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i

/** The spellings of {@link STRINGBOOL_PATTERN} that read as `true`. */
export const STRINGBOOL_TRUTHY_PATTERN = /^(?:true|1|yes|on|y|enabled)$/i

/** The text of a 64-bit integer: a sign and digits, which `BigInt` reads losslessly. */
export const INTEGER_TEXT_PATTERN = /^-?\d+$/

/**
 * Integer text on the string wire. A sign and digits, with no leading zero, no exponent
 * and no fraction: `Number` and `parseInt` both accept more than this (`""`, `" "`,
 * `"0x10"`, `"1e3"`, `"1.9xyz"`).
 */
export const INTEGER_WIRE_PATTERN = /^-?(?:0|[1-9]\d*)$/

/**
 * Number text on the string wire: the JSON number grammar (RFC 8259). An exponent is a
 * number (`1e3`) and is not an integer. Blank, hex and trailing junk are not numbers.
 */
export const NUMBER_WIRE_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/

/** The range of each fixed-width numeric format, as the literals the generators emit. */
export const NUMBER_RANGES: {
  readonly [k: string]: { readonly minimum: string; readonly maximum: string }
} = {
  int32: { minimum: '-2147483648', maximum: '2147483647' },
  uint32: { minimum: '0', maximum: '4294967295' },
  int64: { minimum: '-9223372036854775808n', maximum: '9223372036854775807n' },
  uint64: { minimum: '0n', maximum: '18446744073709551615n' },
  float32: { minimum: '-3.4028234663852886e38', maximum: '3.4028234663852886e38' },
}

/**
 * The `style` values of an OpenAPI Parameter Object: how the parameter's text maps onto its
 * schema.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#style-values
 */
export const PARAM_STYLES = [
  'matrix',
  'label',
  'simple',
  'form',
  'spaceDelimited',
  'pipeDelimited',
  'deepObject',
] as const

/**
 * The properties every plain object inherits from `Object.prototype`. A parameter object
 * read from a request answers these even when the request did not send them.
 */
export const OBJECT_PROTOTYPE_PROPERTIES = [
  '__proto__',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',
] as const

/**
 * The string formats checked with a regular expression where a target has no validator
 * of its own, keyed by the lower-cased format. The patterns are Zod's, so every target
 * accepts and rejects the same text.
 *
 * @see https://github.com/colinhacks/zod/blob/main/packages/zod/src/v4/core/regexes.ts
 */
export const FORMAT_PATTERNS: { readonly [k: string]: RegExp } = {
  guid: /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
  cuid: /^[cC][0-9a-z]{6,}$/,
  cuid2: /^[0-9a-z]+$/,
  // cspell:disable-next-line -- Crockford base32 leaves out I, L, O and U
  ulid: /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/,
  xid: /^[0-9a-vA-V]{20}$/,
  ksuid: /^[A-Za-z0-9]{27}$/,
  nanoid: /^[a-zA-Z0-9_-]{21}$/,
  duration:
    /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/,
  emoji: /^[\p{Extended_Pictographic}\p{Emoji_Component}]+$/u,
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  ipv6: /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/,
  mac: /^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/,
  cidrv4:
    /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/,
  cidrv6:
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  base64: /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/,
  base64url: /^[A-Za-z0-9_-]*$/,
  hostname:
    /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/,
  e164: /^\+[1-9]\d{6,14}$/,
  hex: /^[0-9a-fA-F]*$/,
}

/**
 * The source of an RFC 3339 `full-date` that is a real calendar date: the month decides
 * the days, and February 29 needs a leap year.
 */
export const DATE_PATTERN_SOURCE = String.raw`(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))`

/** The source of a UTC offset: `Z`, or a signed `hh:mm`. */
export const OFFSET_PATTERN_SOURCE = String.raw`(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)`

/** The keywords that only constrain a number: on their own they imply `type: number`. */
export const NUMERIC_KEYWORDS = [
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
] as const

/** The keywords that only constrain a string: on their own they imply `type: string`. */
export const STRING_KEYWORDS = ['minLength', 'maxLength', 'pattern'] as const

/**
 * The keywords that hold a document's named definitions: `$defs` since Draft 2019-09, and
 * `definitions` before it. A document may use both, and the generators read them as one map.
 */
export const DEFINITION_KEYWORDS = ['definitions', '$defs'] as const

/** The `$ref` spellings of the whole document: the schema being emitted refers to itself. */
export const ROOT_REFS = ['#', ''] as const

/** The `$ref` prefixes under which a named definition is found. */
export const DEFINITION_REF_PREFIXES = [
  '#/components/schemas/',
  '#/definitions/',
  '#/$defs/',
] as const

/** The `$ref` prefix of an OpenAPI component schema. */
export const COMPONENT_SCHEMA_REF_PREFIX = '#/components/schemas/'

/**
 * The variable-name suffix of each OpenAPI component kind, by its `$ref` prefix.
 *
 * @see https://swagger.io/docs/specification/v3_0/components/
 */
export const OPENAPI_COMPONENT_SUFFIX_MAP: readonly {
  readonly prefix: string
  readonly suffix: string
}[] = [
  { prefix: '#/components/schemas/', suffix: 'Schema' },
  { prefix: '#/components/parameters/', suffix: 'ParamsSchema' },
  { prefix: '#/components/headers/', suffix: 'HeaderSchema' },
  { prefix: '#/components/securitySchemes/', suffix: 'SecurityScheme' },
  { prefix: '#/components/requestBodies/', suffix: 'RequestBody' },
  { prefix: '#/components/responses/', suffix: 'Response' },
  { prefix: '#/components/examples/', suffix: 'Example' },
  { prefix: '#/components/links/', suffix: 'Link' },
  { prefix: '#/components/callbacks/', suffix: 'Callback' },
  { prefix: '#/components/pathItems/', suffix: 'PathItem' },
  { prefix: '#/components/mediaTypes/', suffix: 'MediaTypeSchema' },
]

/** The name a root schema is exported under when the document has no `title`. */
export const DEFAULT_ROOT_NAME = 'Schema'

/** The extensions of an input document: a JSON Schema as JSON or YAML. */
export const INPUT_EXTENSIONS = ['.json', '.yaml'] as const

/** The extension of the generated file. */
export const OUTPUT_EXTENSION = '.ts'

/** A JavaScript identifier that can be written bare: as a binding, or a key or member access. */
export const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/u

/**
 * A message option written as an arrow function, `(issue) => ...`, rather than as text.
 * Such a message is spliced into the generated code as an expression instead of a string.
 */
export const ARROW_FUNCTION_PATTERN = /^\s*\(.*?\)\s*=>/u

/**
 * A regular expression that needs the `u` flag: Unicode property escapes (`\p{...}`,
 * `\P{...}`) and brace code points (`\u{...}`), which TypeScript rejects without it (TS1530).
 */
export const UNICODE_ESCAPE_PATTERN = /\\[pP]\{|\\u\{/u

/** A non-ASCII character, which an identifier cannot carry as is. */
export const NON_IDENTIFIER_CHARACTER_PATTERN = /[^A-Za-z0-9_-]/u

/** A character that breaks a string-DSL literal and the JS string around it. */
export const QUOTE_OR_BACKSLASH_PATTERN = /['"\\]/u

/** The code-emitting extensions each target honours, in the order they are chained. */
export const ZOD_CODE_EXTENSION_KEYS = [
  'x-refine',
  'x-transform',
  'x-pipe',
  'x-codec',
  'x-preprocess',
] as const

export const VALIBOT_CODE_EXTENSION_KEYS = ['x-check', 'x-transform', 'x-pipe'] as const

export const EFFECT_CODE_EXTENSION_KEYS = ['x-filter', 'x-transform', 'x-pipe'] as const

export const ARKTYPE_CODE_EXTENSION_KEYS = ['x-narrow', 'x-morph', 'x-pipe'] as const

/** Every code-emitting extension any target honours, deduplicated and sorted. */
export const ALL_CODE_EXTENSION_KEYS: readonly string[] = [
  ...new Set<string>([
    ...ZOD_CODE_EXTENSION_KEYS,
    ...VALIBOT_CODE_EXTENSION_KEYS,
    ...EFFECT_CODE_EXTENSION_KEYS,
    ...ARKTYPE_CODE_EXTENSION_KEYS,
  ]),
].toSorted()

/** The first line of a file that spliced a caller-supplied code extension into its source. */
export const UNSAFE_GENERATED_MARKER = '// @generated-with-unsafe-code-extensions'

/** The first line of a file whose generator dropped `if` / `then` / `else`. */
export const IF_THEN_ELSE_UNSUPPORTED_MARKER =
  '// FIXME: JSON Schema if/then/else is not yet supported by this generator; conditional validation is omitted'

/** The first line of a TypeBox file whose generator dropped a `not` keyword. */
export const NOT_KEYWORD_UNSUPPORTED_MARKER =
  '// FIXME: JSON Schema `not` is not enforced by this generator; TypeBox v1 has no runtime `Type.Not` and `Value.Check` ignores the keyword (falls back to `Type.Any()`)'

/** The comment left where a `$ref` names a definition the document does not hold. */
export const MISSING_DEFINITION_PREFIX = '// ⚠️ missing definition for '

/** A JSON Pointer `$ref` to a named definition: `#/$defs/Name` or `#/definitions/Name`. */
export const DEFINITION_POINTER_PATTERN = /^#\/(?:definitions|\$defs)\/(?<name>[^/]+)$/u

/** The Draft-04 anchor shorthand for a named definition: `#Name`. */
export const ANCHOR_REF_PATTERN = /^#(?<name>[^/]+)$/u

/**
 * The ISO 4217 alphabetic codes in current use, funds and precious-metal codes included:
 * what `format: currencyCode` accepts.
 *
 * @see https://www.iso.org/iso-4217-currency-codes.html
 */
export const ISO_4217_CURRENCY_CODES = [
  'AED',
  'AFN',
  'ALL',
  'AMD',
  'ANG',
  'AOA',
  'ARS',
  'AUD',
  'AWG',
  'AZN',
  'BAM',
  'BBD',
  'BDT',
  'BGN',
  'BHD',
  'BIF',
  'BMD',
  'BND',
  'BOB',
  'BOV',
  'BRL',
  'BSD',
  'BTN',
  'BWP',
  'BYN',
  'BZD',
  'CAD',
  'CDF',
  'CHE',
  'CHF',
  'CHW',
  'CLF',
  'CLP',
  'CNY',
  'COP',
  'COU',
  'CRC',
  'CUP',
  'CVE',
  'CZK',
  'DJF',
  'DKK',
  'DOP',
  'DZD',
  'EGP',
  'ERN',
  'ETB',
  'EUR',
  'FJD',
  'FKP',
  'GBP',
  'GEL',
  'GHS',
  'GIP',
  'GMD',
  'GNF',
  'GTQ',
  'GYD',
  'HKD',
  'HNL',
  'HTG',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'IQD',
  'IRR',
  'ISK',
  'JMD',
  'JOD',
  'JPY',
  'KES',
  'KGS',
  'KHR',
  'KMF',
  'KPW',
  'KRW',
  'KWD',
  'KYD',
  'KZT',
  'LAK',
  'LBP',
  'LKR',
  'LRD',
  'LSL',
  'LYD',
  'MAD',
  'MDL',
  'MGA',
  'MKD',
  'MMK',
  'MNT',
  'MOP',
  'MRU',
  'MUR',
  'MVR',
  'MWK',
  'MXN',
  'MXV',
  'MYR',
  'MZN',
  'NAD',
  'NGN',
  'NIO',
  'NOK',
  'NPR',
  'NZD',
  'OMR',
  'PAB',
  'PEN',
  'PGK',
  'PHP',
  'PKR',
  'PLN',
  'PYG',
  'QAR',
  'RON',
  'RSD',
  'RUB',
  'RWF',
  'SAR',
  'SBD',
  'SCR',
  'SDG',
  'SEK',
  'SGD',
  'SHP',
  'SLE',
  'SOS',
  'SRD',
  'SSP',
  'STN',
  'SVC',
  'SYP',
  'SZL',
  'THB',
  'TJS',
  'TMT',
  'TND',
  'TOP',
  'TRY',
  'TTD',
  'TWD',
  'TZS',
  'UAH',
  'UGX',
  'USD',
  'USN',
  'UYI',
  'UYU',
  'UYW',
  'UZS',
  'VED',
  'VES',
  'VND',
  'VUV',
  'WST',
  'XAF',
  'XAG',
  'XAU',
  'XBA',
  'XBB',
  'XBC',
  'XBD',
  'XCD',
  'XCG',
  'XDR',
  'XOF',
  'XPD',
  'XPF',
  'XPT',
  'XSU',
  'XTS',
  'XUA',
  'XXX',
  'YER',
  'ZAR',
  'ZMW',
  'ZWG',
] as const
