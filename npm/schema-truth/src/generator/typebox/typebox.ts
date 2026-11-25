import {
  DEFAULT_ROOT_NAME,
  DEFINITION_REF_PREFIXES,
  INTEGER_WIRE_PATTERN,
  NUMBER_RANGES,
  NUMBER_WIRE_PATTERN,
} from '../../constants/index.js'
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
  enumWithoutWrappedNull,
  foldAllOfMembers,
  isKeywordOnlyMember,
  itemsSchemaOf,
  schemaNamer,
  stringboolPatternText,
  stringboolTruthyPattern,
  typeboxWrap,
  discriminatedMembers,
} from '../../helper/index.js'
import type { SchemaDefinitions } from '../../helper/index.js'
import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import { examplesOf } from '../../helper/schema.js'
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
export function nestedTypeboxOptions(options?: TypeboxOptions) {
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
function tbPrim(name: string, schema: JSONSchema, extraOpts: readonly string[] = [], ref?: string) {
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
function wireString(schema: JSONSchema, ref?: string, pattern?: string) {
  // The text carries the node's metadata and its custom messages, as the non-wire form does:
  // `x-pattern-message` for the wire pattern, `x-error-message` for any failure.
  const errorMessage = schema['x-error-message']
  const patternMessage = pattern === undefined ? undefined : schema['x-pattern-message']
  const messageOpts =
    typeof patternMessage === 'string' && patternMessage !== ''
      ? [
          `errorMessage:{pattern:${JSON.stringify(patternMessage)}${
            typeof errorMessage === 'string' && errorMessage !== ''
              ? `,_:${JSON.stringify(errorMessage)}`
              : ''
          }}`,
        ]
      : messageOpt(errorMessage === '' ? undefined : errorMessage)
  // The examples are documented as the text the wire carries, as its default is.
  const examples = examplesOf(schema)
  const { example: _example, examples: _examples, ...rest } = schema
  const wireSchema: JSONSchema =
    examples === undefined
      ? rest
      : {
          ...rest,
          examples: examples.map((value) =>
            typeof value === 'number' || typeof value === 'boolean' ? String(value) : value,
          ),
        }
  const opts = [
    ...typeboxMetaOpts(wireSchema, ref),
    ...(pattern === undefined ? [] : [`pattern:${pattern}`]),
    ...messageOpts,
    ...typeboxDefaultOpt(schema, true),
  ]
  return opts.length > 0 ? `Type.String({${opts.join(',')}})` : 'Type.String()'
}

/**
 * A number-from-text wire: the `Type.String` carries its pattern as a string, the
 * JSON Schema form (a `RegExp` serializes as `{}`), and each numeric bound is a
 * `Type.Refine` on the text read as a number, since the decoded value is not checked.
 * The first check rejects a number that overflows to `Infinity` and an integer outside
 * the safe integer range, where `Number` may round it. That holds for an int64, uint64 or
 * bigint `format` too, since this wire decodes it with `Number`. A fixed-width `format`
 * (`int32`, `uint32`, `float`, `float32`) adds its range after it.
 */
function numericWire(schema: JSONSchema, kind: 'integer' | 'number', ref?: string) {
  const pattern = kind === 'integer' ? INTEGER_WIRE_PATTERN : NUMBER_WIRE_PATTERN
  return [numericRange(kind), ...formatRange(schema, kind), ...numericBounds(schema)].reduce(
    (wire, [check, keyword, message]) =>
      `Type.Refine(${wire},(value)=>${check},()=>${JSON.stringify(
        // An empty message is absent, as `wireString` reads it.
        [schema[`x-${keyword}-message`], schema['x-error-message']].find(
          (custom) => typeof custom === 'string' && custom !== '',
        ) ?? message,
      )})`,
    wireString(schema, ref, JSON.stringify(pattern.source)),
  )
}

type NumericBound = readonly [
  check: string,
  /** The keyword of its `x-<keyword>-message`; `error` is the range check's `x-error-message`. */
  keyword: 'minimum' | 'exclusiveMinimum' | 'maximum' | 'exclusiveMaximum' | 'multipleOf' | 'error',
  message: string,
]

/** The check that `Number(value)` is finite, or a safe integer for an integer wire. */
function numericRange(kind: 'integer' | 'number'): NumericBound {
  return kind === 'integer'
    ? ['Number.isSafeInteger(Number(value))', 'error', 'must be a safe integer']
    : ['Number.isFinite(Number(value))', 'error', 'must be a finite number']
}

/**
 * The range of a fixed-width `format` on `Number(value)`: `int32` / `uint32` on an integer
 * wire, `float` / `float32` on a number wire, with the bounds the other generators' wires
 * check (`float32` is bounded by the double nearest `FLT_MAX`, as `z.float32()` is). A
 * side the schema already bounds as tightly is left to that keyword's check and message.
 * Its messages are the `x-error-message`, since it is the format's range, not a keyword's.
 */
function formatRange(schema: JSONSchema, kind: 'integer' | 'number'): readonly NumericBound[] {
  const { format, minimum, maximum, exclusiveMinimum, exclusiveMaximum } = schema
  const range =
    kind === 'integer'
      ? format === 'int32' || format === 'uint32'
        ? NUMBER_RANGES[format]
        : undefined
      : format === 'float' || format === 'float32'
        ? NUMBER_RANGES.float32
        : undefined
  if (range === undefined) return []
  const low = Number(range.minimum)
  const high = Number(range.maximum)
  const lowerBounds = [
    ...(minimum === undefined ? [] : [minimum]),
    ...(typeof exclusiveMinimum === 'number' ? [exclusiveMinimum] : []),
  ]
  const upperBounds = [
    ...(maximum === undefined ? [] : [maximum]),
    ...(typeof exclusiveMaximum === 'number' ? [exclusiveMaximum] : []),
  ]
  return [
    ...(lowerBounds.some((bound) => bound >= low)
      ? []
      : [[`Number(value)>=${range.minimum}`, 'error', `must be >= ${range.minimum}`] as const]),
    ...(upperBounds.some((bound) => bound <= high)
      ? []
      : [[`Number(value)<=${range.maximum}`, 'error', `must be <= ${range.maximum}`] as const]),
  ]
}

/** The checks of the numeric keywords on `Number(value)`, with TypeBox's own messages. */
function numericBounds(schema: JSONSchema) {
  const bounds: NumericBound[] = []
  const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf } = schema
  if (minimum !== undefined) {
    bounds.push(
      exclusiveMinimum === true
        ? [`Number(value)>${minimum}`, 'exclusiveMinimum', `must be > ${minimum}`]
        : [`Number(value)>=${minimum}`, 'minimum', `must be >= ${minimum}`],
    )
  }
  if (typeof exclusiveMinimum === 'number') {
    bounds.push([
      `Number(value)>${exclusiveMinimum}`,
      'exclusiveMinimum',
      `must be > ${exclusiveMinimum}`,
    ])
  }
  if (maximum !== undefined) {
    bounds.push(
      exclusiveMaximum === true
        ? [`Number(value)<${maximum}`, 'exclusiveMaximum', `must be < ${maximum}`]
        : [`Number(value)<=${maximum}`, 'maximum', `must be <= ${maximum}`],
    )
  }
  if (typeof exclusiveMaximum === 'number') {
    bounds.push([
      `Number(value)<${exclusiveMaximum}`,
      'exclusiveMaximum',
      `must be < ${exclusiveMaximum}`,
    ])
  }
  if (multipleOf !== undefined) {
    // TypeBox's own `multipleOf` check: an integer passes a divisor of the form 1/n
    // outright, and any other value within its tolerance for binary fractions.
    bounds.push([
      `((number)=>(Number.isInteger(number)&&(1/${multipleOf})%1===0)||((remainder)=>Math.min(Math.abs(remainder),Math.abs(remainder-${multipleOf}),Math.abs(remainder+${multipleOf}))<1e-10)(number%${multipleOf}))(Number(value))`,
      'multipleOf',
      `must be multiple of ${multipleOf}`,
    ])
  }
  return bounds
}

/** A keyword-only `allOf` member. TypeBox has no type-guarded check, so the keyword's type carries it. */
function keywordSchema(schema: JSONSchema) {
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
  definitions?: SchemaDefinitions,
) {
  const opts = [
    ...typeboxRefOpt(ref),
    ...extraOpts,
    ...typeboxMetaOpts(schema),
    ...typeboxDefaultOpt(schema, false, definitions),
  ]
  return opts.length === 0 ? `${name}(${payload})` : `${name}(${payload},{${opts.join(',')}})`
}

/** A reference to a peer of a `Type.Cyclic` map, reached by name. */
function byName(name: string, s: JSONSchema) {
  return tbComp('Type.Ref', `'${name}'`, s)
}

function messageOpt(msg: unknown) {
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
  const named = (name: string, s: JSONSchema) =>
    options?.cyclicRefs?.has(name) ? byName(name, s) : name

  if (schema.$ref) {
    // The expression a `$ref` names, bare: the caller wraps it once with what the node
    // itself carries, a `default` or `nullable` beside the `$ref` included.
    const ref = (s: JSONSchema) => {
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
    const withDefault = (s: JSONSchema) => {
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
    const discriminated = discriminatedMembers(schema, schema.oneOf, options?.definitions)
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
        definitions,
      ),
      schema,
      definitions,
    )
  }

  if (schema.anyOf) {
    if (schema.anyOf.length === 0) {
      return typeboxWrap(tbPrim('Type.Any', schema, [], hostRef), schema)
    }
    const schemas = schema.anyOf.map((s) => typebox(s, rootName, isTypebox, childOptions))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    return typeboxWrap(
      tbComp(
        'Type.Union',
        `[${schemas.join(',')}]`,
        schema,
        messageOpt(anyOfMessage),
        hostRef,
        definitions,
      ),
      schema,
      definitions,
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
        : // oxlint-disable-next-line typescript/no-unnecessary-condition -- the document is parsed JSON, never checked against the type: a null can sit where the type says a schema
          typeof unevaluated === 'object' && unevaluated !== null
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
      schemas.length === 1 &&
      schemas[0] !== undefined &&
      unevaluatedOpt.length === 0 &&
      defaultOpt.length === 0
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
    // `Value.Check` does not evaluate the JSON Schema `not` keyword, so only the
    // keyword itself is dropped, and the omission is surfaced via a file-level marker
    // in `index.ts`. A `type` beside `not` still holds and is generated with its own
    // constraints; a bare `not` falls back to a permissive `Type.Any()`.
    // `x-not-message` rides through `errorMessage` for ajv-compatible
    // downstreams; TypeBox's own `Value.Check` will not surface it.
    // oxlint-disable-next-line no-unused-vars -- the binding is how the rest pattern leaves `not` out
    const { not: dropped, ...withoutNot } = schema
    if (withoutNot.type !== undefined) {
      return typebox(withoutNot, rootName, isTypebox, options)
    }
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
  if (schema.enum) return typeboxWrap(_enum(enumWithoutWrappedNull(schema), hostRef), schema)
  if (schema.properties) {
    return readonly(typeboxWrap(object(schema, rootName, isTypebox, options), schema))
  }

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return typeboxWrap(string(schema, hostRef), schema)
  if (types.includes('number')) {
    if (isStringWireParam) {
      const wire = numericWire(schema, 'number', hostRef)
      return typeboxWrap(
        `Codec(${wire}).Decode((value)=>Number(value)).Encode((value)=>String(value))`,
        schema,
        undefined,
        { stringWire: true },
      )
    }
    return typeboxWrap(number(schema, hostRef), schema)
  }
  if (types.includes('integer')) {
    if (isStringWireParam) {
      const wire = numericWire(schema, 'integer', hostRef)
      return typeboxWrap(
        `Codec(${wire}).Decode((value)=>Number(value)).Encode((value)=>String(value))`,
        schema,
        undefined,
        { stringWire: true },
      )
    }
    return typeboxWrap(integer(schema, hostRef), schema)
  }
  if (types.includes('boolean')) {
    if (isStringWireParam) {
      const wire = wireString(schema, hostRef, JSON.stringify(stringboolPatternText()))
      return typeboxWrap(
        `Codec(${wire}).Decode((value)=>${stringboolTruthyPattern()}.test(value)).Encode((value)=>value?'true':'false')`,
        schema,
        undefined,
        { stringWire: true },
      )
    }
    return typeboxWrap(tbPrim('Type.Boolean', schema, [], hostRef), schema)
  }

  if (types.includes('array')) {
    if (schema.prefixItems !== undefined && schema.prefixItems.length > 0) {
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
    return typeboxWrap(tbPrim('Type.Null', schema, [], hostRef), schema, undefined, {
      nullSchema: true,
    })
  }

  // An `allOf` member that is only `additionalProperties` still constrains every value.
  if (typeof schema.additionalProperties === 'object') {
    return readonly(typeboxWrap(object(schema, rootName, isTypebox, options), schema))
  }

  return typeboxWrap(tbPrim('Type.Any', schema, [], hostRef), schema)
}
