import { DEFAULT_ROOT_NAME } from '../../constants/index.js'
import {
  hasFixedItemCount,
  isComposite,
  isDefaultOnlyMember,
  isNullable,
  isNullTypeMember,
  isSchemaObject,
  isShapelessMember,
  isStringWireLocation,
} from '../../guard/index.js'
import {
  constraintMessage,
  constraintPredicate,
  effectPreprocess,
  effectWrap as _effectWrap,
  foldAllOfMembers,
  hasParameterSerialization,
  impliedWireType,
  isKeywordOnlyMember,
  isNullTextRead,
  isPrimitiveUnion,
  itemsSchemaOf,
  jsLiteral,
  isBigintFormat,
  notPredicate,
  valueListLiteral,
  parameterReaders,
  refTarget,
  stringboolPattern,
  stringboolTruthyPattern,
  unionPrimitiveTypes,
  wireArrayOnce,
  wireNumericKind,
  withoutParameterSerialization,
  evaluatedProperties,
  isEvaluatedKeyExpression,
  discriminatedMembers,
} from '../../helper/index.js'
import type { EffectWrapOptions } from '../../helper/index.js'
import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { effectError, effectErrorPart, makeSafeKey, normalizeTypes } from '../../utils/index.js'
import { _enum, deepEqualSchema } from './enum.js'
import { int64Input, integer, isInt64 } from './integer.js'
import { number, wireNumericInput } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

/**
 * The boolean spellings of the wire, read into a boolean as `z.stringbool()` reads them:
 * `true` / `1` / `yes` / `on` / `y` / `enabled` and their opposites, in any case. v3
 * shipped a `Schema.BooleanFromString` for `true` / `false`; v4 has no such schema, so
 * the transformation is spelled out.
 */
function stringbool(): string {
  return (
    `Schema.String.check(Schema.isPattern(${stringboolPattern()})).pipe(Schema.decodeTo(Schema.Boolean,` +
    `SchemaTransformation.transform({decode:(input)=>${stringboolTruthyPattern()}.test(input),` +
    `encode:(output)=>output?"true":"false"})))`
  )
}

/**
 * True when a generated expression is a `Schema.Struct({...})`, optionally
 * followed by `.check(...)` / `.annotate(...)` chains — the shapes whose
 * `.fields` property survives (v4 rebuilds a struct as a struct).
 */
function isStructExpr(code: string): boolean {
  return code.startsWith('Schema.Struct({')
}

/**
 * The Effect Schema v4 spelling of an `allOf` intersection.
 *
 * v4 has no general `Schema.extend`. Structs intersect by spreading `.fields`,
 * which is the documented replacement and keeps the full combined type. For
 * anything else — a refined string, a union, a record — the first member
 * becomes the base and each remaining member is enforced as a filter, which
 * validates correctly but types the result as the base member alone.
 */
function intersect(schemas: readonly string[]): string {
  const [first, ...rest] = schemas
  if (first === undefined) return 'Schema.Unknown'
  if (schemas.every(isStructExpr)) {
    return `Schema.Struct({${schemas.map((s) => `...${s}.fields`).join(',')}})`
  }
  // A `Schema.suspend` takes no check, and a check on a decoded struct no longer sees the
  // keys the struct strips: the input is decoded through every member and the decoded
  // objects are merged, so each member's defaults and conversions apply. The declared
  // schema says the value has every member's type.
  if (schemas.some((s) => s.startsWith('Schema.suspend('))) {
    const members = schemas.map((s, i) => `const M${i}=${s}`).join(';')
    const type = schemas.map((_, i) => `typeof M${i}.Type`).join('&')
    const test = schemas.map((_, i) => `Schema.is(M${i})(input)`).join('&&')
    const decoded = schemas.map((_, i) => `Schema.decodeUnknownEffect(M${i})(input)`).join(',')
    const merge = `(values)=>{const merged=values.every((value)=>typeof value==='object'&&value!==null&&!Array.isArray(value))?Object.assign({},...values):values[0];return isAll(merged)?Effect.succeed(merged):Effect.fail(new SchemaIssue.InvalidValue(undefined,merged))}`
    const decode = `SchemaGetter.transformEffect((input)=>Effect.all([${decoded}]).pipe(Effect.mapError((error)=>error.issue),Effect.flatMap(${merge})))`
    return `(()=>{${members};const isAll=(input:unknown):input is ${type}=>${test};return Schema.Unknown.pipe(Schema.decodeTo(Schema.declare(isAll),{decode:${decode},encode:SchemaGetter.passthrough({strict:false})}))})()`
  }
  return `${first}.check(${rest.map((s) => `Schema.makeFilter((input)=>Schema.is(${s})(input))`).join(',')})`
}

/**
 * Replace every decoding failure of `inner` with a single message.
 *
 * v4 annotates a node with a plain `message` string, but that only covers
 * issues the node itself reports — a missing or mistyped key is reported
 * deeper and keeps its own message. Validating the whole value through one
 * filter and then decoding restores the v3 `transformOrFail` behaviour of
 * collapsing any failure into the given message, and `decodeTo` carries the
 * inner schema's type through.
 */
export function wholeValueMessage(inner: string, message: string): string {
  return `Schema.Unknown.check(Schema.makeFilter((input)=>Schema.is(${inner})(input),${effectError(message)})).pipe(Schema.decodeTo(${inner}))`
}

/**
 * An `allOf` with `patternProperties` or `unevaluatedProperties` beside it: the members'
 * structs strip what they do not declare, so the keys are checked on the input before it is
 * decoded — a key a pattern matches against that pattern's schema, a key no member
 * evaluates against `unevaluatedProperties`. `inner` as given when there is nothing to check.
 */
function objectKeysCheck(
  inner: string,
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean,
  options: EmitOptions | undefined,
): string {
  const patterns = Object.entries(schema.patternProperties ?? {})
  const unevaluated = schema.unevaluatedProperties
  const unevaluatedSchema = typeof unevaluated === 'object' ? unevaluated : undefined
  const evaluated =
    unevaluated === false || unevaluatedSchema !== undefined
      ? evaluatedProperties(schema, options?.definitions)
      : undefined
  // The input is checked against each schema's encoded side, the side it is read from.
  const accepts = (s: JSONSchema) =>
    `Schema.is(Schema.toEncoded(${effect(s, rootName, isEffect, options)}))(v)`
  const filters = [
    ...patterns.map(
      ([pattern, propSchema]) =>
        `Schema.makeFilter((input)=>typeof input!=='object'||input===null||Array.isArray(input)||Object.entries(input).every(([k,v])=>!new RegExp(${JSON.stringify(pattern)}).test(k)||${accepts(propSchema)})${effectErrorPart(schema['x-patternProperties-message'])})`,
    ),
    ...(evaluated === undefined
      ? []
      : [
          `Schema.makeFilter((input)=>typeof input!=='object'||input===null||Array.isArray(input)||Object.entries(input).every(([k,v])=>${isEvaluatedKeyExpression(evaluated, 'k')}||${unevaluatedSchema === undefined ? 'false' : accepts(unevaluatedSchema)})${effectErrorPart(schema['x-unevaluatedProperties-message'])})`,
        ]),
  ]
  if (filters.length === 0) return inner
  return `Schema.Unknown.check(${filters.join(',')}).pipe(Schema.decodeTo(${inner}))`
}

/**
 * Generate Effect Schema code from a JSON Schema.
 *
 * The `options.readonly` flag is accepted for API symmetry with the other
 * generators but is a no-op for Effect Schema: fields produced by
 * `Schema.Struct({...})` are already `readonly` at the TypeScript type level,
 * and `Schema.Array(...)` returns `ReadonlyArray<T>` by default. Effect Schema
 * has no separate runtime "readonly" wrapper.
 */
export function effect(
  schema: JSONSchema,
  rootName: string = DEFAULT_ROOT_NAME,
  isEffect = false,
  options?: EmitOptions,
): string {
  // The parameter's serialization reads the root's text; the nodes under it see none.
  if (hasParameterSerialization(options)) {
    const inner = effect(schema, rootName, isEffect, withoutParameterSerialization(options))
    return effectPreprocess(parameterReaders(schema, options, 'input'), inner)
  }
  return node(schema, rootName, isEffect, options)
}

/** A keyword-only `allOf` member: the keywords apply when the value has their type. */
function keywordConstraint(schema: JSONSchema): string {
  const body = constraintPredicate(schema, 'input')
  return `Schema.Unknown.check(Schema.makeFilter((input) => ${body}${effectErrorPart(constraintMessage(schema))}))`
}

function node(
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean,
  options: EmitOptions | undefined,
): string {
  const isStringWireParam = isStringWireLocation(options?.paramIn)
  const isWireCoerced = isStringWireParam && schema['x-coerce'] !== false
  const codeExtOpts: EffectWrapOptions =
    options?.unsafeCodeExtensions === true ? { unsafeCodeExtensions: true } : {}
  // On the wire every node's encoded side is text, so its default lands on the decoded
  // side, and the text `null` is read ahead of a node that takes `null` but no string.
  const wireOptions = (s: JSONSchema): EffectWrapOptions => {
    if (!isStringWireParam || s['x-coerce'] === false) return {}
    return { stringWire: true, ...(isNullTextRead(s) && { nullText: true }) }
  }
  const effectWrap = (effectStr: string, s: JSONSchema): string =>
    _effectWrap(effectStr, s, {
      ...codeExtOpts,
      ...wireOptions(s),
      ...(options?.definitions !== undefined && { definitions: options.definitions }),
    })
  const wireArray = (v: string) =>
    isStringWireParam ? effectPreprocess([wireArrayOnce('input')], v) : v
  // What reads a literal's input into the literal's type: on the wire the text is coerced,
  // and a 64-bit integer is a bigint wherever it comes from.
  const literalInput = (values: readonly unknown[]): string | undefined => {
    if (values.every((v) => typeof v === 'number')) {
      if (isInt64(schema)) return int64Input(isWireCoerced)
      if (isWireCoerced) return wireNumericInput(wireNumericKind(schema, values))
    }
    if (isWireCoerced && values.every((v) => typeof v === 'boolean')) return stringbool()
    return undefined
  }

  if (schema.$ref) {
    // The expression a `$ref` names, bare: the caller wraps it once with what the node
    // itself carries, a `default` or `nullable` beside the `$ref` included.
    const ref = (s: JSONSchema): string => {
      if (s.$ref === undefined) return 'Schema.Unknown'
      const target = refTarget(s.$ref, rootName, isEffect, options?.openapi)
      if (target.kind === 'lazy') return `Schema.suspend(() => ${target.name})`
      return target.kind === 'value' ? target.name : 'Schema.Unknown'
    }
    const items = itemsSchemaOf(schema.items)
    if (schema.type === 'array' && items?.$ref) {
      return `Schema.Array(${effectWrap(ref(items), items)})`
    }
    return effectWrap(ref(schema), schema)
  }

  // On the wire a value is text whatever its schema, so a typeless constraint says which
  // type to read the text as.
  const impliedType = isWireCoerced ? impliedWireType(schema) : undefined
  if (impliedType !== undefined) {
    return node({ ...schema, type: impliedType }, rootName, isEffect, options)
  }

  if (schema.oneOf) {
    if (schema.oneOf.length === 0) return effectWrap('Schema.Unknown', schema)
    // A referenced member is held to the discriminator values that select it, so members
    // that overlap (subtypes of one base) do not both match.
    const discriminated = discriminatedMembers(schema, schema.oneOf)
    const schemas = schema.oneOf.map((s, i) => {
      const member = effect(s, rootName, isEffect, options)
      const values = discriminated?.members[i]?.values
      if (discriminated === undefined || values === undefined) return member
      const literal =
        values.length === 1
          ? `Schema.Literal(${JSON.stringify(values[0])})`
          : `Schema.Literals(${JSON.stringify(values)})`
      return intersect([
        member,
        `Schema.Struct({${makeSafeKey(discriminated.propertyName)}:${literal}})`,
      ])
    })
    const oneOfMessage = schema['x-oneOf-message']
    const expr = `Schema.Union([${schemas.join(',')}])`
    return effectWrap(
      oneOfMessage ? `${expr}.annotate(${effectError(oneOfMessage)})` : expr,
      schema,
    )
  }

  if (schema.anyOf) {
    if (schema.anyOf.length === 0) return effectWrap('Schema.Unknown', schema)
    const schemas = schema.anyOf.map((s) => effect(s, rootName, isEffect, options))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    const expr = `Schema.Union([${schemas.join(',')}])`
    return effectWrap(
      anyOfMessage ? `${expr}.annotate(${effectError(anyOfMessage)})` : expr,
      schema,
    )
  }

  if (schema.allOf) {
    if (schema.allOf.length === 0) return effectWrap('Schema.Unknown', schema)
    const nullable = isNullable(schema) || schema.allOf.some(isNullTypeMember)
    const defaultValue = schema.allOf.find(isDefaultOnlyMember)?.default
    const schemas = foldAllOfMembers(
      schema.allOf.filter((s) => !isShapelessMember(s)),
      isWireCoerced,
    ).map((s) =>
      isKeywordOnlyMember(s) ? keywordConstraint(s) : effect(s, rootName, isEffect, options),
    )
    if (schemas.length === 0) return effectWrap('Schema.Unknown', { ...schema, nullable })
    const intersected = schemas.length === 1 ? schemas[0] : intersect(schemas)
    const allOfMessage = schema['x-allOf-message']
    const messaged = allOfMessage ? wholeValueMessage(intersected, allOfMessage) : intersected
    const baseResult = objectKeysCheck(messaged, schema, rootName, isEffect, options)
    if (defaultValue !== undefined) {
      // `Schema.NullOr` wraps a schema, so it stays inside the decoding default.
      const withNullable = nullable ? `Schema.NullOr(${baseResult})` : baseResult
      const decodingDefault = isWireCoerced
        ? 'Schema.withDecodingDefaultType'
        : 'Schema.withDecodingDefault'
      return `${withNullable}.pipe(${decodingDefault}(Effect.succeed(${jsLiteral(defaultValue)})))`
    }
    return effectWrap(baseResult, { ...schema, nullable })
  }

  if (schema.not) {
    const { not: inner, ...withoutNot } = schema
    if (typeof inner !== 'object' || inner === null) return effectWrap('Schema.Unknown', schema)
    const notMessage = schema['x-not-message']
    const filterOpts = effectErrorPart(notMessage)
    const predicate = ((): string | undefined => {
      const bigint = isBigintFormat(withoutNot)
      const shared = notPredicate(inner, 'input', 'input', bigint)
      if (shared !== undefined) return shared
      if (Array.isArray(inner.enum)) {
        // `Array<string>.includes(unknown)` is a type error (the predicate's `input`
        // is `unknown`); compare via `.some(===)` which accepts any operand.
        return `(input) => !${valueListLiteral(inner.enum, bigint)}.some((item) => item === input)`
      }
      return undefined
    })()
    // A `type` beside `not` still holds: the predicate narrows that type, not any value.
    if (withoutNot.type !== undefined) {
      const base = effect(withoutNot, rootName, isEffect, options)
      return predicate ? `${base}.check(Schema.makeFilter(${predicate}${filterOpts}))` : base
    }
    if (predicate) {
      return effectWrap(
        `Schema.Unknown.check(Schema.makeFilter(${predicate}${filterOpts}))`,
        schema,
      )
    }
    return effectWrap('Schema.Unknown', schema)
  }

  if (schema.const !== undefined) {
    // v3.0: x-const-message overrides x-error-message for `const` mismatch.
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    const literalCode =
      typeof schema.const === 'number' && isInt64(schema)
        ? `Schema.Literal(${schema.const}n)`
        : isComposite(schema.const)
          ? deepEqualSchema([schema.const])
          : `Schema.Literal(${JSON.stringify(schema.const)})`
    const withMessage = constMessage
      ? `${literalCode}.annotate(${effectError(constMessage)})`
      : literalCode
    const input = literalInput([schema.const])
    return effectWrap(
      input ? `${input}.pipe(Schema.decodeTo(${withMessage}))` : withMessage,
      schema,
    )
  }
  if (schema.enum) {
    const values = schema.enum.filter((value) => value !== null)
    const input = values.length > 0 ? literalInput(values) : undefined
    if (input === undefined) return effectWrap(_enum(schema), schema)
    // `null` is matched ahead of the coercion, which would read it as `0` or `false`.
    const hasNull = values.length < schema.enum.length
    const piped = `${input}.pipe(Schema.decodeTo(${_enum({ ...schema, enum: values })}))`
    return effectWrap(hasNull && !isNullable(schema) ? `Schema.NullOr(${piped})` : piped, schema)
  }
  if (schema.properties) return effectWrap(object(schema, rootName, isEffect, options), schema)

  const types = normalizeTypes(schema.type)
  const primitive = (t: string): string | undefined => {
    if (t === 'string') return string(schema)
    if (t === 'number') return number(schema, { wire: isWireCoerced })
    if (t === 'integer') return integer(schema, { wire: isWireCoerced })
    if (t !== 'boolean') return undefined
    const errorMessage = schema['x-error-message']
    const base = isWireCoerced ? stringbool() : 'Schema.Boolean'
    return errorMessage ? `${base}.annotate(${effectError(errorMessage)})` : base
  }
  if (isPrimitiveUnion(types, isWireCoerced)) {
    const members = unionPrimitiveTypes(types, isWireCoerced)
      .map(primitive)
      .filter((m) => m !== undefined)
    return effectWrap(`Schema.Union([${members.join(',')}])`, schema)
  }
  for (const t of ['string', 'number', 'integer', 'boolean']) {
    if (!types.includes(t)) continue
    const expression = primitive(t)
    if (expression !== undefined) return effectWrap(expression, schema)
  }

  if (types.includes('array')) {
    const elementMessageWrap = wholeValueMessage
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => effect(s, rootName, isEffect, options))
      // JSON Schema 2020-12 §11.3: unevaluatedItems applies to elements beyond
      // prefixItems. `false` → fixed tuple (the default already rejects
      // extras); a schema → `Schema.TupleWithRest(tuple, [rest])`.
      const u = schema.unevaluatedItems
      const tuple = `Schema.Tuple([${items.join(',')}])`
      const tupleExpr = isSchemaObject(u)
        ? `Schema.TupleWithRest(${tuple},[${effect(u, rootName, isEffect, options)}])`
        : tuple
      const prefixItemsMessage = schema['x-prefixItems-message']
      const wrapped = prefixItemsMessage
        ? elementMessageWrap(tupleExpr, prefixItemsMessage)
        : tupleExpr
      return effectWrap(wireArray(wrapped), schema)
    }
    const itemSchema = itemsSchemaOf(schema.items)
    const items = itemSchema ? effect(itemSchema, rootName, isEffect, options) : 'Schema.Unknown'
    const itemsMessage = schema['x-items-message']
    const arrayBase = `Schema.Array(${items})`
    const base = itemsMessage ? elementMessageWrap(arrayBase, itemsMessage) : arrayBase
    const isFixedLength = hasFixedItemCount(schema)
    // Per-keyword array messages
    const lengthMessage = schema['x-length-message']
    const minItemsMessage = schema['x-minItems-message'] ?? lengthMessage
    const minArg = effectErrorPart(minItemsMessage)
    const maxItemsMessage = schema['x-maxItems-message'] ?? lengthMessage
    const maxArg = effectErrorPart(maxItemsMessage)
    const tupleItemsMessage = minItemsMessage ?? maxItemsMessage
    const sizeArg = effectErrorPart(tupleItemsMessage)
    const uniqueItemsMessage = schema['x-uniqueItems-message']
    const uniqueArg = effectErrorPart(uniqueItemsMessage)
    // v3.0: contains / minContains / maxContains as separate filters
    const containsChecks = (() => {
      const c = schema.contains
      if (!c) return []
      const containsSchema = effect(c, rootName, isEffect, options)
      const minC = schema.minContains
      const maxC = schema.maxContains
      const errorMessage = schema['x-error-message']
      const fallback = schema['x-contains-message'] ?? errorMessage
      const out: string[] = []
      if (minC === undefined && maxC === undefined) {
        const containsArg = effectErrorPart(fallback)
        out.push(
          `Schema.makeFilter((input)=>input.some((item)=>Schema.is(${containsSchema})(item))${containsArg})`,
        )
      } else {
        const effectiveMin = minC ?? 1
        if (effectiveMin > 0) {
          const minContainsMessage = schema['x-minContains-message'] ?? fallback
          const minContainsArg = effectErrorPart(minContainsMessage)
          out.push(
            `Schema.makeFilter((input)=>input.filter((item)=>Schema.is(${containsSchema})(item)).length>=${effectiveMin}${minContainsArg})`,
          )
        }
        if (maxC !== undefined) {
          const maxContainsMessage = schema['x-maxContains-message'] ?? fallback
          const maxContainsArg = effectErrorPart(maxContainsMessage)
          out.push(
            `Schema.makeFilter((input)=>input.filter((item)=>Schema.is(${containsSchema})(item)).length<=${maxC}${maxContainsArg})`,
          )
        }
      }
      return out
    })()
    // unevaluatedItems is handled in the prefixItems branch; with `items` alone,
    // JSON Schema 2020-12 §11.3 makes the keyword redundant.
    const checks = [
      isFixedLength
        ? `Schema.isLengthBetween(${schema.minItems},${schema.minItems}${sizeArg})`
        : undefined,
      !isFixedLength && typeof schema.minItems === 'number'
        ? `Schema.isMinLength(${schema.minItems}${minArg})`
        : undefined,
      !isFixedLength && typeof schema.maxItems === 'number'
        ? `Schema.isMaxLength(${schema.maxItems}${maxArg})`
        : undefined,
      schema.uniqueItems === true ? `Schema.isUnique(${uniqueArg.slice(1)})` : undefined,
      ...containsChecks,
    ].filter((v) => v !== undefined)
    const arrayExpr = checks.length > 0 ? `${base}.check(${checks.join(',')})` : base
    return effectWrap(wireArray(arrayExpr), schema)
  }

  if (types.includes('object')) {
    return effectWrap(object(schema, rootName, isEffect, options), schema)
  }
  if (types.includes('date')) {
    if (isWireCoerced) return effectWrap('Schema.DateFromString', schema)
    return effectWrap('Schema.Date', schema)
  }
  if (types.length === 1 && types[0] === 'null') return effectWrap('Schema.Null', schema)

  // An `allOf` member that is only `additionalProperties` still constrains every value.
  if (typeof schema.additionalProperties === 'object') {
    return effectWrap(object(schema, rootName, isEffect, options), schema)
  }

  return effectWrap('Schema.Unknown', schema)
}
