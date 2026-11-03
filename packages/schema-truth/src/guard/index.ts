import {
  ARROW_FUNCTION_PATTERN,
  DEFINITION_KEYWORDS,
  IDENTIFIER_PATTERN,
  JSON_SCHEMA_TYPES,
  NUMERIC_KEYWORDS,
  OBJECT_PROTOTYPE_PROPERTIES,
  ROOT_REFS,
  STRING_KEYWORDS,
  STRING_WIRE_LOCATIONS,
} from '../constants/index.js'
import type { JSONSchema, JSONSchemaType, ParamIn } from '../parser/index.js'

// ── Values ───────────────────────────────────────────────────────────────

/**
 * Whether a value is a non-null object — the shape every schema walk descends into.
 *
 * `typeof null === 'object'` is the one case worth spelling out; arrays pass, which is
 * what the walkers want, since a combinator list is an array of schemas.
 */
export function isRecord(value: unknown): value is { readonly [k: string]: unknown } {
  return typeof value === 'object' && value !== null
}

/**
 * A non-array object. Distinct from {@link isRecord}: an enum member that is an array
 * needs a tuple matcher, and one that is a plain object needs an object matcher, so the
 * two are told apart here rather than lumped together.
 */
export function isPlainObject(value: unknown): value is { readonly [k: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A JSON scalar: what a `literal` matcher can take as is. */
export function isPrimitive(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

/** An array or object value: one that needs a structural matcher rather than a literal. */
export function isComposite(value: unknown): boolean {
  return typeof value === 'object' && value !== null
}

// ── Names and messages ───────────────────────────────────────────────────

/** Whether a key can be written bare in an object literal or as a member access. */
export function isValidIdentifier(name: string): boolean {
  return IDENTIFIER_PATTERN.test(name)
}

/**
 * Whether a configured message is source text for an arrow function rather than a
 * literal sentence.
 *
 * The `x-*-message` extensions accept either, and a library that takes a callback
 * (Zod's `error`, Valibot's message argument) gets the source through unquoted.
 */
export function isArrowExpression(source: string): boolean {
  return ARROW_FUNCTION_PATTERN.test(source)
}

/** Whether a string is one of the eight `type` names a node may carry. */
export function isJSONSchemaType(value: unknown): value is JSONSchemaType {
  return typeof value === 'string' && JSON_SCHEMA_TYPES.some((type) => type === value)
}

/** Whether a key holds a document's named definitions (`$defs` or `definitions`). */
export function isDefinitionKeyword(key: string): key is (typeof DEFINITION_KEYWORDS)[number] {
  return DEFINITION_KEYWORDS.some((keyword) => keyword === key)
}

/** Whether a parameter location delivers its values as strings that have to be coerced. */
export function isStringWireLocation(
  paramIn: ParamIn | undefined,
): paramIn is (typeof STRING_WIRE_LOCATIONS)[number] {
  return STRING_WIRE_LOCATIONS.some((location) => location === paramIn)
}

/**
 * Whether a property name is one every plain object inherits (`constructor`, `toString`,
 * ...), so reading it off a parameter object that never carried it finds a function.
 */
export function isObjectPrototypeProperty(name: string): boolean {
  return OBJECT_PROTOTYPE_PROPERTIES.some((property) => property === name)
}

// ── References ───────────────────────────────────────────────────────────

/** Whether a `$ref` names the whole document — the schema being emitted refers to itself. */
export function isRootRef(ref: string | undefined): boolean {
  return ROOT_REFS.some((root) => root === ref)
}

/**
 * True for a local JSON Pointer `$ref` that points *into* a component
 * sub-schema (e.g. `#/components/schemas/X/properties/Y`) rather than at a
 * top-level component (`#/components/schemas/X`). Such pointers have no
 * generated declaration, so generators emit an `unknown` schema for them
 * instead of referencing an undeclared identifier.
 *
 * @example
 * ```ts
 * isDeepLocalPointer('#/components/schemas/User')             // false
 * isDeepLocalPointer('#/components/schemas/User/properties/x') // true
 * ```
 */
export function isDeepLocalPointer($ref: string): boolean {
  if (!$ref.startsWith('#/')) return false
  const fragment = $ref.slice(2)
  const containers = ['components/schemas/', 'definitions/', '$defs/']
  const matched = containers.find((c) => fragment.startsWith(c))
  return matched ? fragment.slice(matched.length).includes('/') : false
}

// ── Schema shapes ────────────────────────────────────────────────────────

/**
 * JSON Schema 2020-12 §4.3.2 / §10.3.1.2: `items`, `additionalProperties`,
 * `unevaluatedItems` and `unevaluatedProperties` may be an object schema or a boolean
 * schema (`true` = pass-through, `false` = reject), and `items` may also be a Draft-04
 * tuple. This narrows the union to the single object form so callers can recurse.
 */
export function isSchemaObject(
  value: JSONSchema | readonly JSONSchema[] | boolean | undefined,
): value is JSONSchema {
  return typeof value === 'object' && !Array.isArray(value)
}

/** Draft-04's tuple form of `items`: a list of schemas rather than a single one. */
export function isSchemaList(
  value: JSONSchema | readonly JSONSchema[] | boolean | undefined,
): value is readonly JSONSchema[] {
  return Array.isArray(value)
}

/** Whether a node admits `null`: OpenAPI 3.0 `nullable`, or `null` among its types. */
export function isNullable(schema: JSONSchema): boolean {
  return schema.nullable === true || hasType(schema, 'null')
}

/**
 * Whether a node takes `null`: a nullable type, a `null` among its `enum`, a `const: null`
 * or a `oneOf` / `anyOf` member that does.
 */
export function canBeNull(schema: JSONSchema): boolean {
  if (isNullable(schema)) return true
  if (schema.const === null) return true
  if (schema.enum?.some((value) => value === null)) return true
  return [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])].some(canBeNull)
}

/**
 * Whether a node may take a string: a `string` type, a string among its `enum` or `const`,
 * a `oneOf` / `anyOf` member that does, or no constraint on the type at all.
 */
export function canBeString(schema: JSONSchema): boolean {
  if (hasType(schema, 'string')) return true
  if (typeof schema.const === 'string') return true
  if (schema.enum !== undefined) return schema.enum.some((value) => typeof value === 'string')
  const members = [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]
  if (members.length > 0) return members.some(canBeString)
  return (
    schema.type === undefined &&
    schema.const === undefined &&
    schema.$ref === undefined &&
    schema.allOf === undefined &&
    schema.not === undefined &&
    schema.properties === undefined
  )
}

/** Whether a node without a `type` carries a keyword that only applies to a number. */
export function hasNumericKeyword(schema: JSONSchema): boolean {
  return NUMERIC_KEYWORDS.some((keyword) => schema[keyword] !== undefined)
}

/** Whether a node without a `type` carries a keyword that only applies to a string. */
export function hasStringKeyword(schema: JSONSchema): boolean {
  return STRING_KEYWORDS.some((keyword) => schema[keyword] !== undefined)
}

/** Whether `type` names `type`, either alone or as one of a list. */
export function hasType(schema: JSONSchema, type: JSONSchemaType): boolean {
  const types = schema.type
  if (types === undefined) return false
  if (typeof types === 'string') return types === type
  return types.some((candidate) => candidate === type)
}

/** Whether a node is composed of other schemas: `oneOf`, `anyOf`, `allOf` or `not`. */
export function hasCombinator(schema: JSONSchema): boolean {
  return (
    schema.oneOf !== undefined ||
    schema.anyOf !== undefined ||
    schema.allOf !== undefined ||
    schema.not !== undefined
  )
}

/** Whether a node carries a conditional (`if` / `then` / `else`). */
export function hasConditional(schema: JSONSchema): boolean {
  return schema.if !== undefined || schema.then !== undefined || schema.else !== undefined
}

/** Whether `minLength` and `maxLength` pin a string to exactly one length. */
export function hasFixedLength(schema: JSONSchema): boolean {
  return (
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength
  )
}

/** Whether `minItems` and `maxItems` pin an array to exactly one length. */
export function hasFixedItemCount(schema: JSONSchema): boolean {
  return (
    typeof schema.minItems === 'number' &&
    typeof schema.maxItems === 'number' &&
    schema.minItems === schema.maxItems
  )
}

// ── allOf members ────────────────────────────────────────────────────────

/**
 * An `allOf` member that only says "and it may be null".
 *
 * OpenAPI 3.0 spells a nullable composition as `allOf: [{...}, { nullable: true }]`, and
 * a bare `{ type: 'null' }` is the JSON Schema equivalent. Neither contributes a shape,
 * so every generator lifts it out of the intersection and onto the result instead.
 */
export function isNullTypeMember(schema: JSONSchema): boolean {
  return schema.type === 'null' || (schema.nullable === true && Object.keys(schema).length === 1)
}

/**
 * An `allOf` member that only carries a `default`.
 *
 * A default is metadata on the composed value rather than a constraint of its own, so it
 * is applied to the intersection rather than intersected into it.
 */
export function isDefaultOnlyMember(schema: JSONSchema): boolean {
  return Object.keys(schema).length === 1 && schema.default !== undefined
}

/**
 * An `allOf` member that only carries a `const`.
 *
 * The other members already describe the shape; a lone `const` would narrow it to a
 * single value in a way none of the target libraries express as an intersection, so it is
 * dropped rather than emitted.
 */
export function isConstOnlyMember(schema: JSONSchema): boolean {
  return Object.keys(schema).length === 1 && schema.const !== undefined
}

/**
 * True for an `allOf` member that carries no shape of its own — the ones every generator
 * filters out before intersecting what is left.
 */
export function isShapelessMember(schema: JSONSchema): boolean {
  return isNullTypeMember(schema) || isDefaultOnlyMember(schema) || isConstOnlyMember(schema)
}

// ── Emitted source ───────────────────────────────────────────────────────

/** A double-quoted string literal: the ArkType string DSL form of a definition. */
export function isQuoted(source: string): boolean {
  return source.startsWith('"') && source.endsWith('"')
}

/**
 * A bare ArkType definition — a string, object or tuple literal — as opposed to
 * an expression that already evaluates to a `Type` and so carries methods.
 */
export function isArktypeDefinition(source: string): boolean {
  return (
    isQuoted(source) ||
    (source.startsWith('{') && source.endsWith('}')) ||
    (source.startsWith('[') && source.endsWith(']'))
  )
}
