import { bundle } from '@apidevtools/json-schema-ref-parser'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'

import type {
  CONTENT_ENCODINGS,
  JSON_SCHEMA_TYPES,
  NUMBER_FORMATS,
  STRING_FORMATS,
} from '../constants/index.js'
import type { JSONValue } from './json.js'
import type { XExtCode } from './x-ext/code.js'
import type { XExtMessages } from './x-ext/messages.js'
import type { XExtParam } from './x-ext/param.js'
import type { XExtTransform } from './x-ext/transform.js'

export type { JSONValue } from './json.js'
export type { XExtCode } from './x-ext/code.js'
export type { XExtMessages } from './x-ext/messages.js'
export type { XExtTransform } from './x-ext/transform.js'
export type { ParamIn, ParamStyle, XExtParam } from './x-ext/param.js'

/** The document could not be bundled as a JSON Schema. */
export class ParseError extends Data.TaggedError('ParseError')<{
  readonly message: string
}> {}

/** The bundled document at `input`. Failures land in the error channel. */
export function parseSchemaFile(input: string) {
  return Effect.tryPromise({
    try: () => bundle<JSONSchema>(input),
    catch: (error) =>
      new ParseError({
        message: `Failed to parse schema: ${error instanceof Error ? error.message : String(error)}`,
      }),
  })
}

/**
 * A JSON Schema `type` value: the seven of the specification plus the `date` extension.
 *
 * @see https://json-schema.org/understanding-json-schema/reference/type
 */
export type JSONSchemaType = (typeof JSON_SCHEMA_TYPES)[number]

/** A `format` of a string node. */
export type JSONSchemaStringFormat = (typeof STRING_FORMATS)[number]

/** A `format` of a numeric node. */
export type JSONSchemaNumberFormat = (typeof NUMBER_FORMATS)[number]

/**
 * Every `format` a node may carry: the JSON Schema built-ins, the OpenAPI data-type
 * formats and the target libraries' own names. A format without an equivalent in a target
 * is a no-op there, never an error.
 *
 * @see https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 */
export type JSONSchemaFormat = JSONSchemaStringFormat | JSONSchemaNumberFormat

/** A `contentEncoding` of a string node. */
export type ContentEncoding = (typeof CONTENT_ENCODINGS)[number]

/**
 * A `$ref` into the same document: the whole document (`#`, or the empty string some
 * tools write), a JSON Pointer (`#/$defs/X`, `#/components/schemas/X`), or a plain-name
 * fragment (`#X`, the Draft-04 anchor shorthand).
 */
export type LocalRef = '' | '#' | `#${string}`

/**
 * A `$ref` into another document: a relative path, with or without a fragment, or an
 * absolute URL. `parseSchemaFile` bundles these into the document, so a generator only
 * meets one when it is handed an unbundled schema. A bare name (`User`) is none of these:
 * it is the most common misspelling of `#/$defs/User`, and the type says so.
 */
export type ExternalRef =
  | `${string}.json`
  | `${string}.yaml`
  | `${string}.yml`
  | `${string}/${string}`
  | `${string}#${string}`
  | `${string}://${string}`

/** Every `$ref` form the generators understand. */
export type Ref = LocalRef | ExternalRef

/**
 * A `type` as written: one name, or a non-empty list of names (`["string", "null"]`).
 *
 * @see https://json-schema.org/understanding-json-schema/reference/type
 */
export type JSONSchemaTypes = JSONSchemaType | readonly [JSONSchemaType, ...JSONSchemaType[]]

/**
 * JSON Schema Definition
 *
 * Supports JSON Schema Draft 2020-12, Draft 2019-09, Draft-07, Draft-06, and Draft-04, plus
 * the OpenAPI 3.x additions (`nullable`, `discriminator`, `xml`, `externalDocs`, `example`).
 * There is no index signature: a key the type does not name is a typo, not a keyword, and
 * the vendor extensions are enumerated in `x-ext/`.
 *
 * @see https://json-schema.org/draft/2020-12/json-schema-core
 * @see https://json-schema.org/draft/2020-12/json-schema-validation
 */
type JSONSchemaCore = {
  // ── Core ─────────────────────────────────────────────────────────────
  readonly $schema?: string
  readonly $id?: string
  readonly $ref?: Ref
  readonly $comment?: string
  readonly $vocabulary?: { readonly [k: string]: boolean }
  readonly $anchor?: string
  /** Dynamic anchor (Draft 2020-12) */
  readonly $dynamicAnchor?: string
  /** Dynamic reference (Draft 2020-12) */
  readonly $dynamicRef?: Ref
  /** Schema definitions (Draft 2020-12 / Draft 2019-09) */
  readonly $defs?: { readonly [k: string]: JSONSchema }
  /** Schema definitions (Draft-07 and earlier) */
  readonly definitions?: { readonly [k: string]: JSONSchema }

  // ── Annotations ──────────────────────────────────────────────────────
  readonly title?: string
  readonly description?: string
  readonly default?: JSONValue
  /** Example values (Draft 2019-09+) */
  readonly examples?: readonly JSONValue[]
  /** Single example value (OpenAPI) */
  readonly example?: JSONValue
  readonly deprecated?: boolean
  readonly readOnly?: boolean
  readonly writeOnly?: boolean

  // ── Any instance type ────────────────────────────────────────────────
  readonly type?: JSONSchemaTypes
  readonly format?: JSONSchemaFormat
  readonly const?: JSONValue
  readonly enum?: readonly JSONValue[]

  // ── Strings ──────────────────────────────────────────────────────────
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
  readonly contentMediaType?: string
  readonly contentEncoding?: ContentEncoding
  readonly contentSchema?: JSONSchema

  // ── Numbers ──────────────────────────────────────────────────────────
  readonly minimum?: number
  readonly maximum?: number
  /** Exclusive minimum (Draft 2020-12: number, Draft-04: boolean) */
  readonly exclusiveMinimum?: number | boolean
  /** Exclusive maximum (Draft 2020-12: number, Draft-04: boolean) */
  readonly exclusiveMaximum?: number | boolean
  readonly multipleOf?: number

  // ── Objects ──────────────────────────────────────────────────────────
  readonly properties?: { readonly [k: string]: JSONSchema }
  readonly required?: readonly string[]
  readonly additionalProperties?: boolean | JSONSchema
  readonly patternProperties?: { readonly [k: string]: JSONSchema }
  readonly propertyNames?: JSONSchema
  readonly minProperties?: number
  readonly maxProperties?: number
  /** Dependent required properties (Draft 2019-09+) */
  readonly dependentRequired?: { readonly [k: string]: readonly string[] }
  /** Dependent schemas (Draft 2019-09+) */
  readonly dependentSchemas?: { readonly [k: string]: JSONSchema }
  /**
   * Draft-07 `dependencies`: a list of property names is `dependentRequired`, a schema is
   * `dependentSchemas`. Read for completeness; the generators emit the split keywords.
   */
  readonly dependencies?: { readonly [k: string]: readonly string[] | JSONSchema }
  /** Unevaluated properties (Draft 2019-09+) */
  readonly unevaluatedProperties?: boolean | JSONSchema

  // ── Arrays ───────────────────────────────────────────────────────────
  /**
   * JSON Schema 2020-12 §10.3.1.2: `items` may be a schema, a tuple of schemas (Draft-04
   * compat), or a boolean schema (`true` = any item allowed, `false` = no trailing items).
   * The boolean form matters when paired with `prefixItems`.
   */
  readonly items?: JSONSchema | readonly JSONSchema[] | boolean
  /** Draft-07 `additionalItems`: the schema of the items past a tuple-form `items`. */
  readonly additionalItems?: boolean | JSONSchema
  /** Positional item schemas (Draft 2020-12) */
  readonly prefixItems?: readonly JSONSchema[]
  readonly contains?: JSONSchema
  readonly minItems?: number
  readonly maxItems?: number
  readonly uniqueItems?: boolean
  /** Minimum number of contains matches (Draft 2019-09+) */
  readonly minContains?: number
  /** Maximum number of contains matches (Draft 2019-09+) */
  readonly maxContains?: number
  /** Unevaluated items (Draft 2019-09+) */
  readonly unevaluatedItems?: boolean | JSONSchema

  // ── Composition ──────────────────────────────────────────────────────
  readonly allOf?: readonly JSONSchema[]
  readonly anyOf?: readonly JSONSchema[]
  readonly oneOf?: readonly JSONSchema[]
  readonly not?: JSONSchema

  readonly if?: JSONSchema
  readonly then?: JSONSchema
  readonly else?: JSONSchema

  // ── OpenAPI ──────────────────────────────────────────────────────────
  /** Whether the value can be null (OpenAPI 3.0) */
  readonly nullable?: boolean
  readonly discriminator?: {
    readonly propertyName?: string
    readonly mapping?: { readonly [k: string]: string }
    /** The branch an unlisted discriminator value selects (OpenAPI 3.2) */
    readonly defaultMapping?: string
  }
  readonly xml?: {
    /** How the value is rendered as XML (OpenAPI 3.2) */
    readonly nodeType?: string
    readonly name?: string
    readonly namespace?: string
    readonly prefix?: string
    readonly attribute?: boolean
    readonly wrapped?: boolean
  }
  readonly externalDocs?: {
    readonly url?: string
    readonly description?: string
  }

  /** Schema name (non-standard) */
  readonly name?: string
}

export type JSONSchema = JSONSchemaCore & XExtMessages & XExtTransform & XExtCode & XExtParam
