import { DEFAULT_ROOT_NAME, DEFINITION_REF_PREFIXES } from '../constants/index.js'
import {
  isNullable,
  isNullTypeMember,
  isPlainObject,
  isRootRef,
  isShapelessMember,
} from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { makeSafeKey, normalizeTypes, toPascalCase } from '../utils/index.js'
import { bigintValueLiteral } from './bigint.js'
import { itemsSchemaOf } from './schema.js'
import { jsLiteral } from './value.js'

/** What differs between the generators in the TypeScript type they declare beside a schema. */
export type TypeFlavour = {
  /** The type of the root schema, inferred from its declaration: `z.infer<typeof X>`. */
  readonly inferRoot: (rootName: string) => string
  /** Whether arrays and properties are spelled `readonly`, as Effect's decoded types are. */
  readonly readonly: boolean
}

/** Whether a node is a 64-bit integer, whose number is a bigint. */
function isInt64(schema: JSONSchema) {
  return schema.format === 'int64' || schema.format === 'uint64'
}

/**
 * The TypeScript type of a schema, as the declaration that accompanies a recursive
 * schema (`type _Category = ...`) spells it. A `$ref` names a sibling declaration
 * (`_Name`), the root refers to itself through `inferRoot`, and anything the type cannot
 * say is `unknown`.
 */
export function typeDeclaration(
  schema: JSONSchema | undefined,
  flavour: TypeFlavour,
  rootName: string = DEFAULT_ROOT_NAME,
) {
  if (schema === undefined) return ''
  const base = nonNullType(schema, flavour, rootName)
  // `nullable` (OpenAPI 3.0), a `null` among the types or a `{ type: 'null' }` allOf member
  // widens what the schema emits with `.nullable()`, so the declaration has to say so too.
  const nullable = isNullable(schema) || schema.allOf?.some(isNullTypeMember) === true
  if (!nullable || base === 'null' || base === 'unknown') return base
  return `(${base} | null)`
}

function nonNullType(schema: JSONSchema, flavour: TypeFlavour, rootName: string) {
  const type = (s: JSONSchema | undefined): string => typeDeclaration(s, flavour, rootName)

  if (schema.$ref) {
    if (isRootRef(schema.$ref)) return flavour.inferRoot(rootName)
    for (const prefix of DEFINITION_REF_PREFIXES) {
      if (schema.$ref.startsWith(prefix)) {
        return `_${toPascalCase(schema.$ref.slice(prefix.length))}`
      }
    }
    if (schema.$ref.startsWith('#')) {
      const refName = schema.$ref.slice(1)
      if (refName === '') return flavour.inferRoot(rootName)
      if (!refName.includes('/')) return `_${toPascalCase(refName)}`
    }
    return 'unknown'
  }

  if (schema.oneOf || schema.anyOf) {
    const members = schema.oneOf ?? schema.anyOf ?? []
    return `(${members.map(type).join(' | ')})`
  }

  if (schema.allOf) {
    const members = schema.allOf.filter((s) => !isShapelessMember(s)).map(type)
    const [member, ...others] = members
    if (member === undefined) return 'unknown'
    if (others.length === 0) return member
    return `(${members.join(' & ')})`
  }

  if (schema.not) return 'unknown'

  // A JSON value spelled as a literal is also its own TypeScript literal type; an int64's
  // number is a bigint.
  const literal = (value: unknown) =>
    typeof value === 'number' && isInt64(schema) ? bigintValueLiteral(value) : jsLiteral(value)

  if (schema.const !== undefined) return literal(schema.const)

  if (schema.enum) {
    if (schema.enum.length === 1) return literal(schema.enum[0])
    return `(${schema.enum.map(literal).join(' | ')})`
  }

  const readonly = flavour.readonly ? 'readonly ' : ''
  const object = () => {
    if (!schema.properties) {
      // `additionalProperties: false` without `properties` admits only `{}`, which the
      // declaration has always left as an open record.
      const additional = schema.additionalProperties
      return isPlainObject(additional)
        ? `{ [key: string]: ${type(additional)} }`
        : '{ [key: string]: unknown }'
    }
    const required = new Set(schema.required)
    const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
      const safeKey = makeSafeKey(key)
      const marker = required.has(key) ? '' : '?'
      return `${readonly}${safeKey}${marker}: ${type(propSchema)}`
    })
    return `{${properties.join('; ')}}`
  }

  if (schema.properties) return object()

  const types = normalizeTypes(schema.type)
  const integerType = isInt64(schema) || schema.format === 'bigint' ? 'bigint' : 'number'
  const primitives = [
    types.includes('string') ? 'string' : undefined,
    types.includes('number') ? 'number' : types.includes('integer') ? integerType : undefined,
    types.includes('boolean') ? 'boolean' : undefined,
  ].filter((p) => p !== undefined)
  if (primitives.length > 1 && !types.includes('array') && !types.includes('object')) {
    return `(${primitives.join(' | ')})`
  }
  const [primitive] = primitives
  if (primitive !== undefined) return primitive
  if (types.includes('array')) {
    const items = itemsSchemaOf(schema.items)
    return items ? `${readonly}${type(items)}[]` : `${readonly}unknown[]`
  }
  if (types.includes('object')) return object()
  if (types.includes('date')) return 'Date'
  if (types.length === 1 && types[0] === 'null') return 'null'

  return 'unknown'
}
