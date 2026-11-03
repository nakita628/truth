import { isPlainObject } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'

/**
 * What a keyword's value has to be. A document read from the wild carries values of the
 * wrong type (`minimum: "'created_at' - 21 days"`, a Discriminator Object without
 * `propertyName`, `required: true` on a property): a generator that reads one either
 * throws (`schema.enum.filter is not a function`) or writes it into the source, where it
 * does not type-check (`.max(ten)`). Such a keyword states nothing a schema can check, so
 * it is left out, as a key the generators do not know is.
 */
type Shape =
  | 'string'
  | 'boolean'
  | 'number'
  | 'count'
  | 'positive'
  | 'numberOrBoolean'
  | 'type'
  | 'stringList'
  | 'array'
  | 'object'
  | 'schema'
  | 'schemaOrList'
  | 'schemaList'
  | 'schemaMap'
  | 'dependentRequired'
  | 'dependencies'
  | 'discriminator'
  | 'examples'

const SHAPES: { readonly [keyword: string]: Shape } = {
  $schema: 'string',
  $id: 'string',
  $ref: 'string',
  $comment: 'string',
  $anchor: 'string',
  $dynamicAnchor: 'string',
  $dynamicRef: 'string',
  $vocabulary: 'object',
  $defs: 'schemaMap',
  definitions: 'schemaMap',
  title: 'string',
  description: 'string',
  examples: 'examples',
  deprecated: 'boolean',
  readOnly: 'boolean',
  writeOnly: 'boolean',
  type: 'type',
  format: 'string',
  enum: 'array',
  minLength: 'count',
  maxLength: 'count',
  pattern: 'string',
  contentMediaType: 'string',
  contentEncoding: 'string',
  contentSchema: 'schema',
  minimum: 'number',
  maximum: 'number',
  exclusiveMinimum: 'numberOrBoolean',
  exclusiveMaximum: 'numberOrBoolean',
  multipleOf: 'positive',
  properties: 'schemaMap',
  required: 'stringList',
  additionalProperties: 'schema',
  patternProperties: 'schemaMap',
  propertyNames: 'schema',
  minProperties: 'count',
  maxProperties: 'count',
  dependentRequired: 'dependentRequired',
  dependentSchemas: 'schemaMap',
  dependencies: 'dependencies',
  unevaluatedProperties: 'schema',
  items: 'schemaOrList',
  additionalItems: 'schema',
  prefixItems: 'schemaList',
  contains: 'schema',
  minItems: 'count',
  maxItems: 'count',
  uniqueItems: 'boolean',
  minContains: 'count',
  maxContains: 'count',
  unevaluatedItems: 'schema',
  allOf: 'schemaList',
  anyOf: 'schemaList',
  oneOf: 'schemaList',
  not: 'schema',
  if: 'schema',
  // oxlint-disable-next-line unicorn/no-thenable -- the JSON Schema keyword, not a promise
  then: 'schema',
  else: 'schema',
  nullable: 'boolean',
  discriminator: 'discriminator',
  xml: 'object',
  externalDocs: 'object',
}

/** A schema position holds an object or a boolean schema. */
function isSchemaValue(value: unknown): boolean {
  return typeof value === 'boolean' || isPlainObject(value)
}

function sanitizeNode(node: unknown): unknown {
  return isPlainObject(node) ? sanitizeObject(node) : node
}

function stringMap(value: unknown): { [k: string]: string } | undefined {
  if (!isPlainObject(value)) return undefined
  return Object.fromEntries(
    Object.entries(value).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])),
  )
}

/**
 * `value` as `shape` has it: the value itself, a cleaned copy, or `undefined` when nothing
 * of it has the shape.
 */
function conform(shape: Shape, value: unknown): unknown {
  switch (shape) {
    case 'string':
      return typeof value === 'string' ? value : undefined
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? value : undefined
    case 'count':
      return Number.isInteger(value) && Number(value) >= 0 ? value : undefined
    case 'positive':
      return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
    case 'numberOrBoolean':
      return typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))
        ? value
        : undefined
    case 'type': {
      if (typeof value === 'string') return value
      if (!Array.isArray(value)) return undefined
      const types = value.filter((t) => typeof t === 'string')
      return types.length > 0 ? types : undefined
    }
    case 'stringList':
      // A YAML member read as a literal (`- null`, `- true`) is still a name.
      return Array.isArray(value)
        ? value.flatMap((v) =>
            typeof v === 'string' ? [v] : isPlainObject(v) || Array.isArray(v) ? [] : [String(v)],
          )
        : undefined
    case 'array':
      return Array.isArray(value) ? value : undefined
    case 'object':
      return isPlainObject(value) ? value : undefined
    case 'schema':
      return isSchemaValue(value) ? sanitizeNode(value) : undefined
    case 'schemaOrList':
      return Array.isArray(value) ? conform('schemaList', value) : conform('schema', value)
    case 'schemaList':
      return Array.isArray(value) ? value.filter(isSchemaValue).map(sanitizeNode) : undefined
    case 'schemaMap':
      // A member that is not a schema says nothing about its value: any value.
      return isPlainObject(value)
        ? Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, isSchemaValue(v) ? sanitizeNode(v) : {}]),
          )
        : undefined
    case 'dependentRequired':
      return isPlainObject(value)
        ? Object.fromEntries(
            Object.entries(value).flatMap(([k, v]) => {
              const names = conform('stringList', v)
              return names === undefined ? [] : [[k, names]]
            }),
          )
        : undefined
    case 'dependencies':
      return isPlainObject(value)
        ? Object.fromEntries(
            Object.entries(value).flatMap(([k, v]) => {
              const conformed = Array.isArray(v) ? conform('stringList', v) : conform('schema', v)
              return conformed === undefined ? [] : [[k, conformed]]
            }),
          )
        : undefined
    case 'discriminator': {
      // A Discriminator Object names the property it reads; without one it selects nothing.
      if (!isPlainObject(value) || typeof value.propertyName !== 'string') return undefined
      const { mapping, defaultMapping, ...rest } = value
      const strings = stringMap(mapping)
      return {
        ...rest,
        ...(strings !== undefined && { mapping: strings }),
        ...(typeof defaultMapping === 'string' && { defaultMapping }),
      }
    }
    case 'examples': {
      if (Array.isArray(value)) return value
      // The 3.0 shape, a map of Example Objects: the values they carry.
      if (!isPlainObject(value)) return undefined
      const values = Object.values(value).flatMap((example) =>
        isPlainObject(example) && example.value !== undefined ? [example.value] : [],
      )
      return values.length > 0 ? values : undefined
    }
    default:
      return undefined
  }
}

function sanitizeObject(schema: { readonly [k: string]: unknown }): { [k: string]: unknown } {
  const out: { [k: string]: unknown } = {}
  for (const [key, value] of Object.entries(schema)) {
    const shape = Object.hasOwn(SHAPES, key) ? SHAPES[key] : undefined
    if (shape === undefined) {
      out[key] = value
      continue
    }
    const conformed = conform(shape, value)
    if (conformed !== undefined) out[key] = conformed
  }
  return out
}

/**
 * The document with every keyword whose value does not have the keyword's type left out,
 * at every schema position. Data keywords (`const`, `default`, `enum` members, `example`)
 * and extensions are kept as they are.
 */
export function sanitizeSchema(schema: JSONSchema): JSONSchema {
  return isPlainObject(schema) ? sanitizeObject(schema) : schema
}
