import { DEFAULT_ROOT_NAME, DEFINITION_REF_PREFIXES } from '../constants/index.js'
import { isNullable, isNullTypeMember, isRootRef, isShapelessMember } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { makeSafeKey, normalizeTypes, toPascalCase } from '../utils/index.js'
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
function isInt64(schema: JSONSchema): boolean {
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
): string {
  if (schema === undefined) return ''
  const base = nonNullType(schema, flavour, rootName)
  // `nullable` (OpenAPI 3.0), a `null` among the types or a `{ type: 'null' }` allOf member
  // widens what the schema emits with `.nullable()`, so the declaration has to say so too.
  const nullable = isNullable(schema) || schema.allOf?.some(isNullTypeMember) === true
  if (!nullable || base === 'null' || base === 'unknown') return base
  return `(${base} | null)`
}

function nonNullType(schema: JSONSchema, flavour: TypeFlavour, rootName: string): string {
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
    if (members.length === 0) return 'unknown'
    if (members.length === 1) return members[0]
    return `(${members.join(' & ')})`
  }

  if (schema.not) return 'unknown'

  // A JSON value spelled as a literal is also its own TypeScript literal type; an int64's
  // number is a bigint.
  const literal = (value: unknown): string =>
    typeof value === 'number' && isInt64(schema) ? `${value}n` : jsLiteral(value)

  if (schema.const !== undefined) return literal(schema.const)

  if (schema.enum) {
    if (schema.enum.length === 1) return literal(schema.enum[0])
    return `(${schema.enum.map(literal).join(' | ')})`
  }

  const readonly = flavour.readonly ? 'readonly ' : ''
  const object = (): string => {
    if (!schema.properties) {
      if (schema.additionalProperties) {
        if (typeof schema.additionalProperties === 'boolean') {
          return schema.additionalProperties
            ? '{ [key: string]: unknown }'
            : '{ [key: string]: never }'
        }
        return `{ [key: string]: ${type(schema.additionalProperties)} }`
      }
      return '{ [key: string]: unknown }'
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

  const t = normalizeTypes(schema.type)
  const integerType = isInt64(schema) || schema.format === 'bigint' ? 'bigint' : 'number'
  const primitives = [
    t.includes('string') ? 'string' : undefined,
    t.includes('number') ? 'number' : t.includes('integer') ? integerType : undefined,
    t.includes('boolean') ? 'boolean' : undefined,
  ].filter((p) => p !== undefined)
  if (primitives.length > 1 && !t.includes('array') && !t.includes('object')) {
    return `(${primitives.join(' | ')})`
  }
  if (primitives.length > 0) return primitives[0]
  if (t.includes('array')) {
    const items = itemsSchemaOf(schema.items)
    return items ? `${readonly}${type(items)}[]` : `${readonly}unknown[]`
  }
  if (t.includes('object')) return object()
  if (t.includes('date')) return 'Date'
  if (t.length === 1 && t[0] === 'null') return 'null'

  return 'unknown'
}
