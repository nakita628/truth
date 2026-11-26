import { hasCombinator } from '../../guard/index.js'
import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey } from '../../utils/index.js'
import { nestedTypeboxOptions, typebox } from './typebox.js'
import type { TypeboxOptions } from './typebox.js'

/**
 * Generate a TypeBox object schema for a JSON Schema object node.
 *
 * Combinators (oneOf/anyOf/allOf/not) delegate to the main `typebox` entry.
 * JSON Schema 2020-12 keywords (`minProperties`, `maxProperties`,
 * `propertyNames`, `patternProperties`, `dependentRequired`) are emitted as
 * options on the `Type.Object(payload, opts)` constructor — TypeBox forwards
 * these to AJV at runtime.
 *
 * Note: TypeBox has no native runtime refinement API, so all advanced
 * keywords are passed through as JSON Schema options. Custom error messages
 * (via `x-*-message` extensions) are not emitted because TypeBox / AJV require
 * the optional `ajv-errors` plugin for that — we keep generation portable.
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isTypebox: boolean,
  options?: TypeboxOptions,
) {
  const childOptions = nestedTypeboxOptions(options)

  if (hasCombinator(schema)) return typebox(schema, rootName, isTypebox, options)

  // ── additionalProperties: schema → Type.Record(...) ──
  // With `properties` or patterns beside it, `additionalProperties` covers only the keys
  // they leave: an option of the object below, which TypeBox evaluates itself.
  if (
    typeof schema.additionalProperties === 'object' &&
    schema.properties === undefined &&
    schema.patternProperties === undefined
  ) {
    const value = typebox(schema.additionalProperties, rootName, isTypebox, childOptions)
    const recordOpts = [
      ...typeboxRefOpt(options?.ref),
      ...buildAdvancedOpts(schema, rootName, isTypebox, childOptions),
      ...typeboxMetaOpts(schema),
      ...typeboxDefaultOpt(schema),
    ].filter((v) => v !== undefined)
    return recordOpts.length === 0
      ? `Type.Record(Type.String(),${value})`
      : `Type.Record(Type.String(),${value},{${recordOpts.join(',')}})`
  }

  if (!schema.properties) {
    if (schema.additionalProperties === true) {
      const anyOpts = [
        ...typeboxRefOpt(options?.ref),
        ...typeboxMetaOpts(schema),
        ...typeboxDefaultOpt(schema),
      ]
      return anyOpts.length === 0 ? 'Type.Any()' : `Type.Any({${anyOpts.join(',')}})`
    }
    const emptyOpts = [
      ...typeboxRefOpt(options?.ref),
      schema.additionalProperties === false
        ? 'additionalProperties:false'
        : typeof schema.additionalProperties === 'object'
          ? `additionalProperties:${typebox(schema.additionalProperties, rootName, isTypebox, childOptions)}`
          : undefined,
      ...buildAdvancedOpts(schema, rootName, isTypebox, childOptions),
      ...typeboxMetaOpts(schema),
      ...typeboxDefaultOpt(schema),
    ].filter((v) => v !== undefined)
    return emptyOpts.length === 0 ? 'Type.Object({})' : `Type.Object({},{${emptyOpts.join(',')}})`
  }

  const required = new Set(schema.required)
  // A required key no property declares only has to be present, with any value.
  const undeclaredRequired = (schema.required ?? [])
    .filter((key) => !Object.hasOwn(schema.properties ?? {}, key))
    .map((key) => `${makeSafeKey(key)}:Type.Unknown()`)
  const props = [
    ...Object.entries(schema.properties)
      .map(([key, propSchema]) => {
        const parsed = typebox(propSchema, rootName, isTypebox, childOptions)
        if (!parsed) return null
        const safeKey = makeSafeKey(key)
        // A property with a default its output carries is already `Type.Optional` from its
        // own emitter, so it is not wrapped a second time.
        return required.has(key) || /^(?:Type\.Readonly\()*Type\.Optional\(/.test(parsed)
          ? `${safeKey}:${parsed}`
          : `${safeKey}:Type.Optional(${parsed})`
      })
      .filter((p) => p !== null),
    ...undeclaredRequired,
  ]

  // v3.0: aggregate all v3.0 object-related x-*-message extensions
  // into a single ajv-errors–compatible `errorMessage` annotation.
  const objectErrorMessageEntries: string[] = []
  const objectErrorMessage = schema['x-error-message']
  if (objectErrorMessage) {
    objectErrorMessageEntries.push(`type:${JSON.stringify(objectErrorMessage)}`)
  }
  const objectMinPropertiesMessage = schema['x-minProperties-message']
  if (objectMinPropertiesMessage) {
    objectErrorMessageEntries.push(`minProperties:${JSON.stringify(objectMinPropertiesMessage)}`)
  }
  const objectMaxPropertiesMessage = schema['x-maxProperties-message']
  if (objectMaxPropertiesMessage) {
    objectErrorMessageEntries.push(`maxProperties:${JSON.stringify(objectMaxPropertiesMessage)}`)
  }
  const objectAdditionalPropertiesMessage = schema['x-additionalProperties-message']
  if (objectAdditionalPropertiesMessage) {
    objectErrorMessageEntries.push(
      `additionalProperties:${JSON.stringify(objectAdditionalPropertiesMessage)}`,
    )
  }
  const objectPropertyNamesMessage = schema['x-propertyNames-message']
  if (objectPropertyNamesMessage) {
    objectErrorMessageEntries.push(`propertyNames:${JSON.stringify(objectPropertyNamesMessage)}`)
  }
  const objectPatternPropertiesMessage = schema['x-patternProperties-message']
  if (objectPatternPropertiesMessage) {
    objectErrorMessageEntries.push(
      `patternProperties:${JSON.stringify(objectPatternPropertiesMessage)}`,
    )
  }
  const objectDependentRequiredMessage = schema['x-dependentRequired-message']
  if (objectDependentRequiredMessage) {
    objectErrorMessageEntries.push(
      `dependentRequired:${JSON.stringify(objectDependentRequiredMessage)}`,
    )
  }
  const objectDependentSchemasMessage = schema['x-dependentSchemas-message']
  if (objectDependentSchemasMessage) {
    objectErrorMessageEntries.push(
      `dependentSchemas:${JSON.stringify(objectDependentSchemasMessage)}`,
    )
  }
  const objectRequiredMessage = schema['x-required-message']
  if (objectRequiredMessage) {
    objectErrorMessageEntries.push(`required:${JSON.stringify(objectRequiredMessage)}`)
  }
  const objectPropertiesMessage = schema['x-properties-message']
  if (objectPropertiesMessage) {
    objectErrorMessageEntries.push(`properties:${JSON.stringify(objectPropertiesMessage)}`)
  }
  const objectIfMessage = schema['x-if-message']
  const objectThenMessage = schema['x-then-message'] ?? objectIfMessage
  if (objectThenMessage) objectErrorMessageEntries.push(`then:${JSON.stringify(objectThenMessage)}`)
  const objectElseMessage = schema['x-else-message'] ?? objectIfMessage
  if (objectElseMessage) objectErrorMessageEntries.push(`else:${JSON.stringify(objectElseMessage)}`)
  const objectUnevaluatedPropertiesMessage = schema['x-unevaluatedProperties-message']
  if (objectUnevaluatedPropertiesMessage) {
    objectErrorMessageEntries.push(
      `unevaluatedProperties:${JSON.stringify(objectUnevaluatedPropertiesMessage)}`,
    )
  }
  const objectErrorMessageField =
    objectErrorMessageEntries.length > 0
      ? `errorMessage:{${objectErrorMessageEntries.join(',')}}`
      : undefined
  const optParts = [
    ...typeboxRefOpt(options?.ref),
    schema.additionalProperties === false
      ? 'additionalProperties:false'
      : typeof schema.additionalProperties === 'object'
        ? `additionalProperties:${typebox(schema.additionalProperties, rootName, isTypebox, childOptions)}`
        : undefined,
    ...buildAdvancedOpts(schema, rootName, isTypebox, childOptions),
    objectErrorMessageField,
    ...typeboxMetaOpts(schema),
    ...typeboxDefaultOpt(schema),
  ].filter((v) => v !== undefined)
  const opts = optParts.length > 0 ? `,{${optParts.join(',')}}` : ''
  return `Type.Object({${props.join(',')}}${opts})`
}

/**
 * Build TypeBox option entries for advanced JSON Schema 2020-12 keywords.
 * Returns an array of `'key:value'` strings ready to be joined into `{...}`.
 */
function buildAdvancedOpts(
  schema: JSONSchema,
  rootName: string,
  isTypebox: boolean,
  options?: TypeboxOptions,
) {
  const propertyNamesOpt = propertyNamesOption(schema.propertyNames, rootName, isTypebox, options)
  const patternPropertiesOpt = schema.patternProperties
    ? `patternProperties:{${Object.entries(schema.patternProperties)
        .map(
          ([pattern, propSchema]) =>
            `${JSON.stringify(pattern)}:${typebox(propSchema, rootName, isTypebox, options)}`,
        )
        .join(',')}}`
    : undefined
  const dependentRequiredOpt = schema.dependentRequired
    ? `dependentRequired:{${Object.entries(schema.dependentRequired)
        .map(([key, deps]) => `${JSON.stringify(key)}:${JSON.stringify(deps)}`)
        .join(',')}}`
    : undefined
  const ifOpt = schema.if ? `if:${typebox(schema.if, rootName, isTypebox, options)}` : undefined
  const thenOpt = schema.then
    ? `then:${typebox(schema.then, rootName, isTypebox, options)}`
    : undefined
  const elseOpt = schema.else
    ? `else:${typebox(schema.else, rootName, isTypebox, options)}`
    : undefined
  const requiredOpt =
    !schema.properties && Array.isArray(schema.required) && schema.required.length > 0
      ? `required:${JSON.stringify(schema.required)}`
      : undefined
  // TypeBox evaluates `unevaluatedProperties` itself, against `properties` and the patterns.
  const unevaluated = schema.unevaluatedProperties
  const unevaluatedOpt =
    unevaluated === false
      ? 'unevaluatedProperties:false'
      : typeof unevaluated === 'object'
        ? `unevaluatedProperties:${typebox(unevaluated, rootName, isTypebox, options)}`
        : undefined
  return [
    typeof schema.minProperties === 'number' ? `minProperties:${schema.minProperties}` : undefined,
    typeof schema.maxProperties === 'number' ? `maxProperties:${schema.maxProperties}` : undefined,
    propertyNamesOpt,
    patternPropertiesOpt,
    dependentRequiredOpt,
    ifOpt,
    thenOpt,
    elseOpt,
    requiredOpt,
    unevaluatedOpt,
  ]
}

/**
 * The `propertyNames` option. Every key is a string, so a key schema is read as a string
 * one ({@link asKeySchema}); `false`, and an `enum` / `const` with no string value, allow no
 * key, and `true` every key. The document is parsed JSON, so anything can sit where the
 * type says a schema.
 */
function propertyNamesOption(
  keySchema: JSONSchema | boolean | undefined,
  rootName: string,
  isTypebox: boolean,
  options: TypeboxOptions | undefined,
) {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- parsed JSON: a null can sit where the type says a schema
  if (typeof keySchema !== 'object' || keySchema === null) {
    return keySchema === false ? 'propertyNames:Type.Never()' : undefined
  }
  const key = asKeySchema(keySchema)
  if (key === false) return 'propertyNames:Type.Never()'
  return `propertyNames:${typebox(key, rootName, isTypebox, options)}`
}

/**
 * A key schema as a string one: no type of its own reads as `type: 'string'` (composition
 * members and `not` too), `enum` / `const` keep only their string values, and beside an
 * `allOf` or a union the own keywords become one more `allOf` member. `false` (or a schema reduced to it)
 * allows no key: it drops out of an `anyOf` / `oneOf`, makes an `allOf` allow none, and a
 * `not` of it allows every key. A `$ref` is left as it is. The document is parsed JSON, so
 * anything can sit where the type says a schema; a non-object reads as no constraint.
 */
function asKeySchema(keySchema: JSONSchema | boolean | undefined): JSONSchema | false {
  if (keySchema === false) return false
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- parsed JSON: a null can sit where the type says a schema
  if (typeof keySchema !== 'object' || keySchema === null) return { type: 'string' }
  if (keySchema.$ref !== undefined) return keySchema
  const strings = keySchema.enum?.filter((value) => typeof value === 'string')
  if (strings?.length === 0) return false
  if (keySchema.const !== undefined && typeof keySchema.const !== 'string') return false
  const read = (list: readonly (JSONSchema | boolean)[] | undefined) => list?.map(asKeySchema)
  const anyOf = read(keySchema.anyOf)?.filter((member) => member !== false)
  const oneOf = read(keySchema.oneOf)?.filter((member) => member !== false)
  const allOf = read(keySchema.allOf)
  if (anyOf?.length === 0 || oneOf?.length === 0 || allOf?.includes(false) === true) return false
  const not = parsedSchema(keySchema.not)
  // `not: true` allows no key; `not: false` (or a `not` that allows none) allows every key.
  if (not === true) return false
  const negated = not === undefined ? undefined : asKeySchema(not)
  const { allOf: _allOf, anyOf: _anyOf, oneOf: _oneOf, not: _not, ...own } = keySchema
  const union: JSONSchema | undefined =
    anyOf !== undefined ? { anyOf } : oneOf !== undefined ? { oneOf } : undefined
  const ownRead: JSONSchema = {
    ...own,
    ...(keySchema.type === undefined && { type: 'string' }),
    ...(strings !== undefined && { enum: strings }),
    ...(negated !== undefined && negated !== false && { not: negated }),
  }
  // `typebox()` reads an `allOf` or a union alone, so the key schema's own keywords join
  // them as one more member, left out when they are only the string type read here.
  const hasOwn = Object.keys(own).length > 0 || ownRead.not !== undefined
  const members = [
    ...(hasOwn || (union === undefined && allOf === undefined) ? [ownRead] : []),
    ...(union === undefined ? [] : [union]),
    ...(allOf ?? []).filter((member) => member !== false),
  ]
  return members.length === 1 && members[0] !== undefined ? members[0] : { allOf: members }
}

/** A subschema as parsed JSON can hold it: a boolean where the type says a schema. */
function parsedSchema(value: JSONSchema | boolean | undefined) {
  return value
}
