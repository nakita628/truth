import { DEFAULT_ROOT_NAME, DEFINITION_REF_PREFIXES } from '../../constants/index.js'
import {
  hasNumericKeyword,
  hasStringKeyword,
  isDeepLocalPointer,
  isDefaultOnlyMember,
  isNullable,
  isNullTypeMember,
  isRootRef,
  isShapelessMember,
  isStringWireLocation,
} from '../../guard/index.js'
import {
  foldAllOfMembers,
  integerWirePattern,
  isKeywordOnlyMember,
  itemsSchemaOf,
  numberWirePattern,
  schemaNamer,
  stringboolPattern,
  stringboolTruthyPattern,
  typeboxWrap,
  discriminatedMembers,
} from '../../helper/index.js'
import type { SchemaDefinitions } from '../../helper/index.js'
import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import type { JSONSchema, ParamIn } from '../../parser/index.js'
import { makeSafeKey, normalizeTypes, resolveOpenAPIRef } from '../../utils/index.js'
import { _enum } from './enum.js'
import { integer } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

/**
 * Generation options threaded through every TypeBox emitter.
 *
 * `cyclicRefs` holds the PascalCase names that `schemaToTypebox` is emitting
 * inside a single `Type.Cyclic($defs, root)` map. References to those names
 * become `Type.Ref('Name')` instead of a bare identifier, because a `const`
 * cannot reference a peer that is declared later in the cycle.
 *
 * `ref` is a host `$ref` name for the **current** node only (the outermost
 * `Type.*` factory). Nested calls drop it so properties and `$defs` members
 * do not inherit the root's name.
 */
export type TypeboxOptions = {
  readonly openapi?: boolean
  readonly readonly?: boolean
  readonly paramIn?: ParamIn
  readonly cyclicRefs?: ReadonlySet<string>
  readonly ref?: string
  /** Definitions a `default` beside a `$ref` is checked against. */
  readonly definitions?: SchemaDefinitions
}

/**
 * Options for a nested TypeBox node: the same as `options` but without a
 * host `ref`, so only the outermost factory of a declaration receives it.
 */
export function nestedTypeboxOptions(options?: TypeboxOptions): TypeboxOptions | undefined {
  if (options === undefined) return undefined
  return {
    ...(options.openapi !== undefined && { openapi: options.openapi }),
    ...(options.readonly !== undefined && { readonly: options.readonly }),
    ...(options.paramIn !== undefined && { paramIn: options.paramIn }),
    ...(options.cyclicRefs !== undefined && { cyclicRefs: options.cyclicRefs }),
    ...(options.definitions !== undefined && { definitions: options.definitions }),
  }
}

/**
 * Emits a single-argument TypeBox factory call (`Type.X({opts})`), embedding
 * any meta options from the schema. Returns `Type.X()` when no options.
 */
function tbPrim(
  name: string,
  schema: JSONSchema,
  extraOpts: readonly string[] = [],
  ref?: string,
): string {
  const opts = [
    ...typeboxRefOpt(ref),
    ...extraOpts,
    ...typeboxMetaOpts(schema),
    ...typeboxDefaultOpt(schema),
  ]
  return opts.length === 0 ? `${name}()` : `${name}({${opts.join(',')}})`
}

/**
 * The `Type.String(...)` input of a string-wire coercion `Codec`. A query/path
 * default is carried here in its string-wire form (`{default:'1'}`), since the
 * Codec decodes from a string. A host `ref` lands on this inner `Type.String`,
 * not on the `Codec(...)` wrapper.
 */
function wireString(schema: JSONSchema, ref?: string, pattern?: string): string {
  const opts = [
    ...typeboxRefOpt(ref),
    ...(pattern === undefined ? [] : [`pattern:${pattern}`]),
    ...typeboxDefaultOpt(schema, true),
  ]
  return opts.length > 0 ? `Type.String({${opts.join(',')}})` : 'Type.String()'
}

/** A keyword-only `allOf` member. TypeBox has no type-guarded check, so the keyword's type carries it. */
function keywordSchema(schema: JSONSchema): string {
  if (hasStringKeyword(schema) && !hasNumericKeyword(schema)) {
    return string({ ...schema, type: 'string' })
  }
  if (hasNumericKeyword(schema) && !hasStringKeyword(schema)) {
    return number({ ...schema, type: 'number' })
  }
  return 'Type.Any()'
}

/**
 * Emits a two-argument TypeBox factory call (`Type.X(payload, {opts})`),
 * embedding any meta options from the schema. Returns `Type.X(payload)` when
 * no options.
 */
function tbComp(
  name: string,
  payload: string,
  schema: JSONSchema,
  extraOpts: readonly string[] = [],
  ref?: string,
): string {
  const opts = [
    ...typeboxRefOpt(ref),
    ...extraOpts,
    ...typeboxMetaOpts(schema),
    ...typeboxDefaultOpt(schema),
  ]
  return opts.length === 0 ? `${name}(${payload})` : `${name}(${payload},{${opts.join(',')}})`
}

/** A reference to a peer of a `Type.Cyclic` map, reached by name. */
function byName(name: string, s: JSONSchema): string {
  return tbComp('Type.Ref', `'${name}'`, s)
}

function messageOpt(msg: unknown): readonly string[] {
  return typeof msg === 'string' ? [`errorMessage:${JSON.stringify(msg)}`] : []
}

export function typebox(
  schema: JSONSchema,
  rootName: string = DEFAULT_ROOT_NAME,
  isTypebox = false,
  options?: TypeboxOptions,
): string {
  const isStringWireParam = isStringWireLocation(options?.paramIn) && schema['x-coerce'] !== false
  const readonly = (v: string) => (options?.readonly ? `Type.Readonly(${v})` : v)
  const hostRef = options?.ref
  const childOptions = nestedTypeboxOptions(options)
  const definitions = options?.definitions

  // A name emitted inside `Type.Cyclic($defs, root)` can only be reached by
  // name — the peer `const` it would otherwise reference may be declared later
  // in the same cycle.
  const named = (name: string, s: JSONSchema): string =>
    options?.cyclicRefs?.has(name) ? byName(name, s) : name

  if (schema.$ref) {
    // The expression a `$ref` names, bare: the caller wraps it once with what the node
    // itself carries, a `default` or `nullable` beside the `$ref` included.
    const ref = (s: JSONSchema): string => {
      // A reference back to the schema being emitted is always a cycle, so it
      // always goes by name — `schemaToTypebox` puts such a schema inside a
      // `Type.Cyclic` map.
      if (isRootRef(s.$ref)) return byName(rootName, s)
      if (typeof s.$ref === 'string' && isDeepLocalPointer(s.$ref)) return 'Type.Unknown()'
      if (options?.openapi && s.$ref) {
        const resolved = resolveOpenAPIRef(s.$ref)
        if (resolved) return resolved === rootName ? byName(resolved, s) : named(resolved, s)
      }
      const toName = schemaNamer(options?.openapi)
      for (const prefix of DEFINITION_REF_PREFIXES) {
        if (s.$ref?.startsWith(prefix)) return named(toName(s.$ref.slice(prefix.length)), s)
      }
      if (s.$ref?.startsWith('#')) {
        const refName = s.$ref.slice(1)
        return refName === '' ? named(rootName, s) : named(toName(refName), s)
      }
      if (s.$ref?.includes('#')) return 'Type.Unknown()'
      if (s.$ref?.startsWith('http')) {
        const last = s.$ref.split('/').at(-1)
        if (last) return last.replace(/\.json$/, '')
      }
      return 'Type.Any()'
    }
    // A `default` beside a `$ref` rides on a one-member intersection: the referenced
    // schema is shared, so its own options cannot carry it.
    const withDefault = (s: JSONSchema): string => {
      const defaultOpt = typeboxDefaultOpt(s, false, definitions)
      const target = ref(s)
      const inner =
        defaultOpt.length === 0 ? target : `Type.Intersect([${target}],{${defaultOpt.join(',')}})`
      return typeboxWrap(inner, s, definitions)
    }
    const items = itemsSchemaOf(schema.items)
    if (schema.type === 'array' && items?.$ref) {
      return `Type.Array(${withDefault(items)})`
    }
    return withDefault(schema)
  }

  if (schema.oneOf) {
    if (schema.oneOf.length === 0) {
      return typeboxWrap(tbPrim('Type.Any', schema, [], hostRef), schema)
    }
    // A referenced member is held to the discriminator values that select it, so members
    // that overlap (subtypes of one base) do not both match.
    const discriminated = discriminatedMembers(schema, schema.oneOf)
    const schemas = schema.oneOf.map((s, i) => {
      const member = typebox(s, rootName, isTypebox, childOptions)
      const values = discriminated?.members[i]?.values
      if (discriminated === undefined || values === undefined) return member
      const literals = values.map((value) => `Type.Literal(${JSON.stringify(value)})`)
      const literal = literals.length === 1 ? literals[0] : `Type.Union([${literals.join(',')}])`
      return `Type.Intersect([${member},Type.Object({${makeSafeKey(discriminated.propertyName)}:${literal}})])`
    })
    return typeboxWrap(
      tbComp(
        'Type.Union',
        `[${schemas.join(',')}]`,
        schema,
        messageOpt(schema['x-oneOf-message']),
        hostRef,
      ),
      schema,
    )
  }

  if (schema.anyOf) {
    if (schema.anyOf.length === 0) {
      return typeboxWrap(tbPrim('Type.Any', schema, [], hostRef), schema)
    }
    const schemas = schema.anyOf.map((s) => typebox(s, rootName, isTypebox, childOptions))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    return typeboxWrap(
      tbComp('Type.Union', `[${schemas.join(',')}]`, schema, messageOpt(anyOfMessage), hostRef),
      schema,
    )
  }

  if (schema.allOf) {
    if (schema.allOf.length === 0) {
      return typeboxWrap(tbPrim('Type.Any', schema, [], hostRef), schema)
    }
    const nullable = isNullable(schema) || schema.allOf.some(isNullTypeMember)
    const defaultValue = schema.allOf.find(isDefaultOnlyMember)?.default
    const schemas = foldAllOfMembers(
      schema.allOf.filter((s) => !isShapelessMember(s)),
      isStringWireParam,
    ).map((s) =>
      isKeywordOnlyMember(s) ? keywordSchema(s) : typebox(s, rootName, isTypebox, childOptions),
    )
    if (schemas.length === 0) {
      return typeboxWrap(tbPrim('Type.Any', schema, [], hostRef), { ...schema, nullable })
    }
    // TypeBox evaluates `patternProperties` and `unevaluatedProperties` across the
    // intersection itself.
    const unevaluated = schema.unevaluatedProperties
    const patternOpt =
      schema.patternProperties === undefined
        ? []
        : [
            `patternProperties:{${Object.entries(schema.patternProperties)
              .map(
                ([pattern, propSchema]) =>
                  `${JSON.stringify(pattern)}:${typebox(propSchema, rootName, isTypebox, childOptions)}`,
              )
              .join(',')}}`,
          ]
    const unevaluatedOpt = [
      ...patternOpt,
      ...(unevaluated === false
        ? ['unevaluatedProperties:false']
        : typeof unevaluated === 'object' && unevaluated !== null
          ? [`unevaluatedProperties:${typebox(unevaluated, rootName, isTypebox, childOptions)}`]
          : []),
    ]
    // A `default` beside `allOf`, or in a default-only member, is checked against the
    // members and carried on the `Type.Intersect` (a one-member intersection is the
    // member itself): TypeBox v1's `Type.Optional` takes no default of its own.
    const { default: ownDefault, ...withoutDefault } = schema
    const withMergedDefault: JSONSchema = {
      ...withoutDefault,
      nullable,
      ...(defaultValue !== undefined
        ? { default: defaultValue }
        : ownDefault !== undefined && { default: ownDefault }),
    }
    const defaultOpt = typeboxDefaultOpt(withMergedDefault, false, definitions)
    const baseResult =
      schemas.length === 1 && unevaluatedOpt.length === 0 && defaultOpt.length === 0
        ? schemas[0]
        : tbComp(
            'Type.Intersect',
            `[${schemas.join(',')}]`,
            withoutDefault,
            [...messageOpt(schema['x-allOf-message']), ...unevaluatedOpt, ...defaultOpt],
            hostRef,
          )
    return typeboxWrap(baseResult, withMergedDefault, definitions)
  }

  if (schema.not) {
    // TypeBox v1 does not expose a runtime `Type.Not(...)` constructor and
    // `Value.Check` does not evaluate the JSON Schema `not` keyword. We emit
    // a permissive `Type.Any()` fallback so the generated file still imports,
    // and surface the omission via a file-level marker in `index.ts`.
    // `x-not-message` rides through `errorMessage` for ajv-compatible
    // downstreams; TypeBox's own `Value.Check` will not surface it.
    return typeboxWrap(
      tbPrim('Type.Any', schema, messageOpt(schema['x-not-message']), hostRef),
      schema,
    )
  }

  if (schema.const !== undefined) {
    // v3.0: x-const-message overrides x-error-message for literal mismatch.
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    // `TLiteralValue` is scalar-only and excludes null: a null const becomes
    // Type.Null(), and an array/object const degrades to Type.Any() (the same
    // fallback the enum path uses for composite members).
    if (schema.const === null) {
      return typeboxWrap(tbPrim('Type.Null', schema, messageOpt(constMessage), hostRef), schema)
    }
    if (typeof schema.const === 'object') {
      return typeboxWrap(tbPrim('Type.Any', schema, messageOpt(constMessage), hostRef), schema)
    }
    return typeboxWrap(
      tbComp(
        'Type.Literal',
        JSON.stringify(schema.const),
        schema,
        messageOpt(constMessage),
        hostRef,
      ),
      schema,
    )
  }
  if (schema.enum) return typeboxWrap(_enum(schema, hostRef), schema)
  if (schema.properties) {
    return readonly(typeboxWrap(object(schema, rootName, isTypebox, options), schema))
  }

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return typeboxWrap(string(schema, hostRef), schema)
  if (types.includes('number')) {
    const base = number(schema, hostRef)
    if (isStringWireParam) {
      const wire = wireString(schema, hostRef, numberWirePattern())
      return typeboxWrap(
        `Codec(${wire}).Decode((value)=>Number(value)).Encode((value)=>String(value))`,
        schema,
      )
    }
    return typeboxWrap(base, schema)
  }
  if (types.includes('integer')) {
    const base = integer(schema, hostRef)
    if (isStringWireParam) {
      const wire = wireString(schema, hostRef, integerWirePattern())
      return typeboxWrap(
        `Codec(${wire}).Decode((value)=>Number(value)).Encode((value)=>String(value))`,
        schema,
      )
    }
    return typeboxWrap(base, schema)
  }
  if (types.includes('boolean')) {
    if (isStringWireParam) {
      const wire = wireString(schema, hostRef, stringboolPattern())
      return typeboxWrap(
        `Codec(${wire}).Decode((value)=>${stringboolTruthyPattern()}.test(value)).Encode((value)=>value?'true':'false')`,
        schema,
      )
    }
    return typeboxWrap(tbPrim('Type.Boolean', schema, [], hostRef), schema)
  }

  if (types.includes('array')) {
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => typebox(s, rootName, isTypebox, childOptions))
      const prefixItemsMessage = schema['x-prefixItems-message']
      const tupleOpts = prefixItemsMessage
        ? [
            `errorMessage:{prefixItems:${JSON.stringify(prefixItemsMessage)},items:${JSON.stringify(prefixItemsMessage)}}`,
          ]
        : []
      return readonly(
        typeboxWrap(
          tbComp('Type.Tuple', `[${items.join(',')}]`, schema, tupleOpts, hostRef),
          schema,
        ),
      )
    }
    const itemSchema = itemsSchemaOf(schema.items)
    const items = itemSchema ? typebox(itemSchema, rootName, isTypebox, childOptions) : 'Type.Any()'
    // v3.0: per-keyword array messages aggregated into ajv-errors errorMessage.
    const arrayErrorMessageEntries: string[] = []
    const arrayErrorMessage = schema['x-error-message']
    if (arrayErrorMessage) {
      arrayErrorMessageEntries.push(`type:${JSON.stringify(arrayErrorMessage)}`)
    }
    const arrayLengthMessage = schema['x-length-message']
    const arrayMinItemsMessage =
      schema['x-minItems-message'] ??
      (typeof schema.minItems === 'number' ? arrayLengthMessage : undefined)
    if (arrayMinItemsMessage) {
      arrayErrorMessageEntries.push(`minItems:${JSON.stringify(arrayMinItemsMessage)}`)
    }
    const arrayMaxItemsMessage =
      schema['x-maxItems-message'] ??
      (typeof schema.maxItems === 'number' ? arrayLengthMessage : undefined)
    if (arrayMaxItemsMessage) {
      arrayErrorMessageEntries.push(`maxItems:${JSON.stringify(arrayMaxItemsMessage)}`)
    }
    const arrayUniqueItemsMessage = schema['x-uniqueItems-message']
    if (arrayUniqueItemsMessage) {
      arrayErrorMessageEntries.push(`uniqueItems:${JSON.stringify(arrayUniqueItemsMessage)}`)
    }
    const arrayContainsMessage = schema['x-contains-message']
    if (arrayContainsMessage) {
      arrayErrorMessageEntries.push(`contains:${JSON.stringify(arrayContainsMessage)}`)
    }
    const arrayMinContainsMessage = schema['x-minContains-message']
    if (arrayMinContainsMessage) {
      arrayErrorMessageEntries.push(`minContains:${JSON.stringify(arrayMinContainsMessage)}`)
    }
    const arrayMaxContainsMessage = schema['x-maxContains-message']
    if (arrayMaxContainsMessage) {
      arrayErrorMessageEntries.push(`maxContains:${JSON.stringify(arrayMaxContainsMessage)}`)
    }
    const arrayItemsMessage = schema['x-items-message']
    if (arrayItemsMessage) {
      arrayErrorMessageEntries.push(`items:${JSON.stringify(arrayItemsMessage)}`)
    }
    const arrayUnevaluatedItemsMessage = schema['x-unevaluatedItems-message']
    if (arrayUnevaluatedItemsMessage) {
      arrayErrorMessageEntries.push(
        `unevaluatedItems:${JSON.stringify(arrayUnevaluatedItemsMessage)}`,
      )
    }
    const arrayOpts = [
      typeof schema.minItems === 'number' ? `minItems:${schema.minItems}` : undefined,
      typeof schema.maxItems === 'number' ? `maxItems:${schema.maxItems}` : undefined,
      schema.uniqueItems === true ? `uniqueItems:true` : undefined,
      arrayErrorMessageEntries.length > 0
        ? `errorMessage:{${arrayErrorMessageEntries.join(',')}}`
        : undefined,
    ].filter((v) => v !== undefined)
    return readonly(typeboxWrap(tbComp('Type.Array', items, schema, arrayOpts, hostRef), schema))
  }

  if (types.includes('object')) {
    return readonly(typeboxWrap(object(schema, rootName, isTypebox, options), schema))
  }
  if (types.includes('date')) {
    // TypeBox v1 dropped `Type.Date()` — it models JSON Schema only, and
    // `Date` has no JSON Schema type. The portable equivalent is a `Codec`
    // over an ISO string, which is also what the query/path wire form uses.
    const wire = wireString(schema, hostRef)
    return typeboxWrap(
      `Codec(${wire}).Decode((value)=>new Date(value)).Encode((value)=>value.toISOString())`,
      schema,
    )
  }
  if (types.length === 1 && types[0] === 'null') {
    return typeboxWrap(tbPrim('Type.Null', schema, [], hostRef), schema)
  }

  // An `allOf` member that is only `additionalProperties` still constrains every value.
  if (typeof schema.additionalProperties === 'object') {
    return readonly(typeboxWrap(object(schema, rootName, isTypebox, options), schema))
  }

  return typeboxWrap(tbPrim('Type.Any', schema, [], hostRef), schema)
}
