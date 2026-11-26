import {
  DEFAULT_ROOT_NAME,
  DEFINITION_REF_PREFIXES,
  QUOTE_OR_BACKSLASH_PATTERN,
} from '../../constants/index.js'
import {
  hasCombinator,
  hasFixedItemCount,
  isArktypeDefinition,
  isDeepLocalPointer,
  isNullable,
  isNullTypeMember,
  isQuoted,
  isRootRef,
  isSchemaObject,
  isShapelessMember,
  isStringWireLocation,
} from '../../guard/index.js'
import { bigintValueLiteral } from '../../helper/bigint.js'
import {
  additionalBesideCombinator,
  enumWithoutWrappedNull,
  arktypePreprocess,
  arktypeWrap as _arktypeWrap,
  constraintMessage,
  constraintPredicate,
  foldAllOfMembers,
  hasParameterSerialization,
  impliedWireType,
  isKeywordOnlyMember,
  isNullMatchedFirst,
  isNullTextRead,
  isPrimitiveUnion,
  itemsSchemaOf,
  isBigintFormat,
  notPredicate,
  valueListLiteral,
  parameterReaders,
  schemaNamer,
  stringboolPattern,
  stringboolTruthyPattern,
  unionPrimitiveTypes,
  wireArrayOnce,
  wireNullText,
  wireNumericKind,
  withoutParameterSerialization,
  evaluatedProperties,
  discriminatedMembers,
  callbackReturn,
  callbackType,
  arktypeUnionLimit,
  dslNeedsGroup,
  dslUnionMembers,
} from '../../helper/index.js'
import type { ArktypeWrapOptions } from '../../helper/index.js'
import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { normalizeTypes, resolveOpenAPIRef } from '../../utils/index.js'
import { _enum, isDslLiteralUnion } from './enum.js'
import { bigintMorph, integer, isInt64 } from './integer.js'
import { number, numberMorph } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

/**
 * Combine two ArkType expressions.
 *
 * Inside `scope({...})` a definition may name a scope-local alias, which the
 * global `type(...)` cannot resolve, so scope mode composes with ArkType's
 * tuple expressions — which stay in definition syntax — instead of methods.
 */
function combine(op: '&' | '|', inScope: boolean) {
  return (acc: string, s: string) =>
    inScope && isArktypeDefinition(acc)
      ? `[${acc},"${op}",${s}]`
      : `type(${acc}).${op === '&' ? 'and' : 'or'}(${s})`
}

/** `items` in consecutive groups of at most `size`. */
function chunksOf<T>(items: readonly T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  )
}

/**
 * A union of ArkType expressions. Quoted members join into one string-DSL union, unless
 * it has more members than {@link arktypeUnionLimit} allows: then literals become
 * `type.enumerated(...)` and anything else is joined in groups, so no single string is
 * long enough to exceed TypeScript's instantiation depth.
 */
function unionStr(schemas: string[], inScope = false) {
  if (!schemas.every(isQuoted)) return schemas.reduce(combine('|', inScope))
  const members = schemas.flatMap((s) => dslUnionMembers(s.slice(1, -1)))
  const limit = arktypeUnionLimit(members)
  if (members.length <= limit) return `"${members.join(' | ')}"`
  if (isDslLiteralUnion(members)) return `type.enumerated(${members.join(',')})`
  return chunksOf(members, limit)
    .map((group) => `"${group.join(' | ')}"`)
    .reduce(combine('|', inScope))
}

/** A quoted definition that can be written into a longer string as it is, unparenthesized. */
function isPlainOperand(source: string, withIntersection = false) {
  return isQuoted(source) && !dslNeedsGroup(source.slice(1, -1), withIntersection)
}

function intersectionStr(schemas: string[], inScope = false) {
  return schemas.every((s) => isPlainOperand(s))
    ? `"${schemas.map((s) => s.slice(1, -1)).join(' & ')}"`
    : schemas.reduce(combine('&', inScope))
}

/** An ArkType expression that carries methods: a quoted definition is wrapped in `type(...)`. */
function asRuntime(source: string) {
  return isQuoted(source) ? `type(${source})` : source
}

/**
 * A tuple's rest as an array. A rest that is an expression rather than a quoted
 * definition — a long union written as `type.enumerated(...)` or an `.or` chain — becomes
 * an array value.
 */
function restArray(rest: string) {
  if (isPlainOperand(rest, true)) return `"${rest.slice(1, -1)}[]"`
  return isArktypeDefinition(rest) ? `[${rest},"[]"]` : `${rest}.array()`
}

/** Whether an expression reads its input through a morph: ArkType cannot union two of them. */
function isMorph(source: string) {
  return source.includes('.pipe(') || source.includes('"=>"')
}

/** Whether an expression transforms its input: a morph, a `.to()` transform or a parsing keyword. */
function readsInput(source: string) {
  return isMorph(source) || source.includes('.to(') || source.includes('.parse')
}

/**
 * A union of wire members, each a morph over the text, tried in order: ArkType refuses
 * an unordered union of morphs with overlapping inputs, so the first branch that reads
 * the text wins, as `z.union()` reads it.
 */
function wireUnion(schemas: readonly string[], message: string | undefined, inScope: boolean) {
  // Inside a scope a tuple or object definition branch (a wire array) is reached through the
  // scope when the value is read; the global `type(...)` cannot resolve an alias in it.
  const branches = schemas
    .map((s) => (inScope && isArktypeDefinition(s) && !isQuoted(s) ? `$.type(${s})` : asRuntime(s)))
    .join(',')
  const expected = JSON.stringify(message ?? 'one of the members')
  // A callback that reaches `$` spells out its return type: `$` is still being declared.
  const params = branches.includes('$.type(') ? '(data, ctx): unknown' : '(data, ctx)'
  return `type("unknown").pipe(${params} => { for (const branch of [${branches}]) { const out = branch(data); if (!(out instanceof type.errors)) return out } return ctx.error(${expected}) })`
}

/** `morph` validated against `inner` after it, unless `inner` is the bare keyword the morph already reads. */
function wireNumeric(morph: string, inner: string) {
  if (inner === '"number"' || inner === '"number.integer"') return morph
  return isQuoted(inner) ? `${morph}.to(${inner})` : `${morph}.pipe(${inner})`
}

/** The boolean spellings of the wire, read into a boolean as `z.stringbool()` reads them. */
function stringbool() {
  return `type(${stringboolPattern()}).pipe((data) => ${stringboolTruthyPattern()}.test(data))`
}

/** A keyword-only `allOf` member: the keywords apply when the value has their type. */
function keywordConstraint(schema: JSONSchema) {
  const body = constraintPredicate(schema, 'data')
  const message = constraintMessage(schema)
  if (message === undefined) return `type("unknown").narrow((data) => ${body})`
  return `type("unknown").narrow((data, ctx) => (${body}) || ctx.mustBe(${JSON.stringify(message)}))`
}

function formatConst(value: unknown, isBigint: boolean) {
  if (typeof value === 'string') return `"'${value}'"`
  if (typeof value === 'number' && isBigint) return `"${bigintValueLiteral(value)}"`
  if (typeof value === 'number' || typeof value === 'boolean') return `"${String(value)}"`
  if (value !== null && typeof value === 'object') return '"unknown"'
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- JSON.stringify returns undefined for undefined, a function or a symbol; lib.d.ts types it as string
  return `"${JSON.stringify(value) ?? 'null'}"`
}

/** Whether an `allOf` member is a numeric primitive whose constraints can be merged into one definition. */
function isNumericMember(schema: JSONSchema) {
  return (
    (schema.type === 'number' || schema.type === 'integer') &&
    schema.$ref === undefined &&
    !hasCombinator(schema) &&
    schema.enum === undefined &&
    schema.const === undefined &&
    !isInt64(schema) &&
    schema.format !== 'bigint'
  )
}

/** An ArkType regex index-signature key for `source`, its slashes escaped. */
function indexKey(source: string) {
  return JSON.stringify(`[/${source.replaceAll('/', '\\/')}/]`)
}

/**
 * The members an `allOf` gains from `patternProperties` and `unevaluatedProperties` beside
 * it: a regex index signature per pattern, holding the keys it matches to its schema, and
 * one matching every key no member evaluates (no listed name, no pattern matching anywhere
 * in it), holding it to `unevaluatedProperties`. An index signature can name a scope alias,
 * which a `.narrow()` callback cannot.
 */
function objectKeysMembers(
  schema: JSONSchema,
  rootName: string,
  isArktype: boolean,
  options: EmitOptions | undefined,
) {
  const patternMembers = Object.entries(schema.patternProperties ?? {}).map(
    ([pattern, propSchema]) =>
      `{${indexKey(pattern)}:${arktype(propSchema, rootName, isArktype, options)}}`,
  )
  const unevaluated = schema.unevaluatedProperties
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- the document is parsed JSON, never checked against the type: a null can sit where the type says a schema
  if (unevaluated !== false && (typeof unevaluated !== 'object' || unevaluated === null)) {
    return patternMembers
  }
  const evaluated = evaluatedProperties(schema, options?.definitions)
  if (evaluated === undefined) return patternMembers
  const value =
    unevaluated === false ? '"never"' : arktype(unevaluated, rootName, isArktype, options)
  // `indexKey` escapes the slashes; everything else a name may hold is escaped here.
  const names = evaluated.names.map((name) => name.replaceAll(/[\\^$.*+?()[\]{}|]/gu, '\\$&'))
  const exclusions = [
    ...(names.length === 0 ? [] : [`(?!(?:${names.join('|')})$)`]),
    ...evaluated.patterns.map((pattern) => `(?![\\s\\S]*?(?:${pattern}))`),
  ]
  return [...patternMembers, `{${indexKey(`^${exclusions.join('')}`)}:${value}}`]
}

/**
 * Generate ArkType schema code from JSON Schema.
 *
 * @example
 * ```ts
 * arktype({ type: 'string' }, 'MySchema') // '"string"'
 * ```
 */
export function arktype(
  schema: JSONSchema,
  rootName: string = DEFAULT_ROOT_NAME,
  isArktype = false,
  options?: EmitOptions,
): string {
  // The parameter's serialization reads the root's text; the nodes under it see none.
  if (hasParameterSerialization(options)) {
    const inner = arktype(schema, rootName, isArktype, withoutParameterSerialization(options))
    return arktypePreprocess(parameterReaders(schema, options, 'data'), inner)
  }
  const expression = node(schema, rootName, isArktype, options)
  const isWireCoerced = isStringWireLocation(options?.paramIn) && schema['x-coerce'] !== false
  if (!isWireCoerced || !isNullTextRead(schema)) return expression
  const nullFirst = isNullMatchedFirst(schema)
    ? expression
    : _arktypeWrap(expression, { nullable: true }, { ...(isArktype && { scopeMode: true }) })
  return arktypePreprocess([wireNullText('data')], nullFirst)
}

function node(
  schema: JSONSchema,
  rootName: string,
  isArktype: boolean,
  options: EmitOptions | undefined,
) {
  // `additionalProperties` beside a combinator holds the keys the node itself leaves.
  const split = additionalBesideCombinator(schema)
  if (split !== undefined) return node(split, rootName, isArktype, options)
  const codeExtOpts: ArktypeWrapOptions = {
    ...(options?.unsafeCodeExtensions === true && { unsafeCodeExtensions: true }),
    ...(isArktype && { scopeMode: true }),
  }
  const arktypeWrap = (
    arktypeStr: string,
    s: JSONSchema,
    extra?: { readonly nullSchema?: boolean },
  ) => _arktypeWrap(arktypeStr, s, { ...codeExtOpts, ...extra })
  const readonly = (v: string) => (options?.readonly ? `${v}.readonly()` : v)
  const isStringWireParam = isStringWireLocation(options?.paramIn)
  const isWireCoerced = isStringWireParam && schema['x-coerce'] !== false
  // Inside a scope a definition is piped to in definition syntax, which the scope resolves;
  // `.to()` on the global `type(...)` cannot resolve an alias.
  const wireArray = (v: string) =>
    !isStringWireParam
      ? v
      : isArktype && isArktypeDefinition(v)
        ? `[["unknown","=>",${wireArrayOnce('data')}],"|>",${v}]`
        : arktypePreprocess([wireArrayOnce('data')], v)
  // What reads a literal's input into the literal's type: on the wire the text is coerced,
  // and a 64-bit integer is a bigint wherever it comes from.
  const literalInput = (values: readonly unknown[]) => {
    if (values.every((v) => typeof v === 'number')) {
      if (isInt64(schema)) return bigintMorph(isWireCoerced)
      if (isWireCoerced) {
        return wireNumericKind(schema, values) === 'integer'
          ? numberMorph('isSafeInteger', 'an integer')
          : numberMorph('isFinite', 'a number')
      }
    }
    if (isWireCoerced && values.every((v) => typeof v === 'boolean')) return stringbool()
    return undefined
  }
  const describeWithMessage = (expr: string, msg: unknown) => {
    if (typeof msg !== 'string') return expr
    const text = JSON.stringify(msg)
    if (isArktype && isArktypeDefinition(expr)) return `[${expr},"@",${text}]`
    return `${isQuoted(expr) ? `type(${expr})` : expr}.describe(${text})`
  }
  const unionOf = (schemas: string[], message: string | undefined) =>
    isWireCoerced && schemas.some(isMorph)
      ? wireUnion(schemas, message, isArktype)
      : describeWithMessage(unionStr(schemas, isArktype), message)

  if (schema.$ref) {
    // Scope mode (isArktype) resolves refs through `scope({...})` as DSL keywords (`"User"`).
    // Standalone exports (`const X = type(...)`) have no scope, so a cross-schema ref must be a
    // value reference to the imported const (`User`). Self-refs stay quoted: a value ref to the
    // const being defined would hit a TDZ; recursion is only expressible in scope mode.
    const emitRef = (name: string) => (!isArktype && name !== rootName ? name : `"${name}"`)
    const ref = (s: JSONSchema) => {
      if (isRootRef(s.$ref)) return `"${rootName}"`
      if (typeof s.$ref === 'string' && isDeepLocalPointer(s.$ref)) return '"unknown"'
      if (options?.openapi && s.$ref) {
        const resolved = resolveOpenAPIRef(s.$ref)
        if (resolved) return emitRef(resolved)
      }
      const toName = schemaNamer(options?.openapi)
      for (const prefix of DEFINITION_REF_PREFIXES) {
        if (s.$ref?.startsWith(prefix)) return emitRef(toName(s.$ref.slice(prefix.length)))
      }
      if (s.$ref?.startsWith('#')) {
        const refName = s.$ref.slice(1)
        return refName === '' ? `"${rootName}"` : emitRef(toName(refName))
      }
      return '"unknown"'
    }
    const items = itemsSchemaOf(schema.items)
    if (schema.type === 'array' && items?.$ref) {
      // A scope names its aliases by quoted definitions, which have no `.array()`.
      const item = ref(items)
      const array = isPlainOperand(item, true) ? `"${item.slice(1, -1)}[]"` : `${item}.array()`
      return arktypeWrap(array, schema)
    }
    return arktypeWrap(ref(schema), schema)
  }

  // On the wire a value is text whatever its schema, so a typeless constraint says which
  // type to read the text as.
  const impliedType = isWireCoerced ? impliedWireType(schema) : undefined
  if (impliedType !== undefined) {
    return node({ ...schema, type: impliedType }, rootName, isArktype, options)
  }

  if (schema.oneOf) {
    if (schema.oneOf.length === 0) return arktypeWrap('"unknown"', schema)
    // A referenced member is held to the discriminator values that select it, so members
    // that overlap (subtypes of one base) do not both match.
    const discriminated = discriminatedMembers(schema, schema.oneOf, options?.definitions)
    const schemas = schema.oneOf.map((s, i) => {
      const member = arktype(s, rootName, isArktype, options)
      const values = discriminated?.members[i]?.values
      if (discriminated === undefined || values === undefined) return member
      const literal = values.map((value) => `'${value.replaceAll(/['\\]/gu, '\\$&')}'`).join(' | ')
      return intersectionStr(
        [member, `{${JSON.stringify(discriminated.propertyName)}:${JSON.stringify(literal)}}`],
        isArktype,
      )
    })
    return arktypeWrap(unionOf(schemas, schema['x-oneOf-message']), schema)
  }

  if (schema.anyOf) {
    if (schema.anyOf.length === 0) return arktypeWrap('"unknown"', schema)
    const schemas = schema.anyOf.map((s) => arktype(s, rootName, isArktype, options))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    return arktypeWrap(unionOf(schemas, anyOfMessage), schema)
  }

  if (schema.allOf) {
    if (schema.allOf.length === 0) return arktypeWrap('"unknown"', schema)
    const nullable = isNullable(schema) || schema.allOf.some(isNullTypeMember)
    const members = foldAllOfMembers(
      schema.allOf.filter((s) => !isShapelessMember(s)),
      isWireCoerced,
    )
    // ArkType refuses an intersection of two morphs, so numeric wire members share one
    // morph: `morph.to("number >= 1 & number <= 5")`. Keyword-only members are folded
    // into that member first, so `{ minimum: 5 }` is not a second morph.
    if (isWireCoerced && members.length > 0 && members.every(isNumericMember)) {
      const definitions = members.map((s) => (s.type === 'integer' ? integer(s) : number(s)))
      const isInteger = members.some((s) => s.type === 'integer')
      const morph = isInteger
        ? numberMorph('isSafeInteger', 'an integer')
        : numberMorph('isFinite', 'a number')
      const merged = definitions.every((definition) => isPlainOperand(definition))
        ? (() => {
            const parts = definitions
              .map((definition) => definition.slice(1, -1))
              .filter((definition) => definition !== 'number' && definition !== 'number.integer')
            if (parts.length === 0) return isInteger ? '"number.integer"' : '"number"'
            return `"${parts.join(' & ')}"`
          })()
        : definitions.length === 1 && definitions[0] !== undefined
          ? definitions[0]
          : intersectionStr(definitions, isArktype)
      return arktypeWrap(wireNumeric(morph, merged), { ...schema, nullable })
    }
    const schemas = members.map((s) =>
      isKeywordOnlyMember(s) ? keywordConstraint(s) : arktype(s, rootName, isArktype, options),
    )
    if (schemas.length === 0) return arktypeWrap('"unknown"', { ...schema, nullable })
    const intersected = [...schemas, ...objectKeysMembers(schema, rootName, isArktype, options)]
    const baseResult =
      intersected.length === 1 && intersected[0] !== undefined
        ? intersected[0]
        : intersectionStr(intersected, isArktype)
    return arktypeWrap(baseResult, { ...schema, nullable })
  }

  if (schema.not) {
    const { not: inner, ...withoutNot } = schema
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- the document is parsed JSON, never checked against the type: a null can sit where the type says a schema
    if (typeof inner !== 'object' || inner === null) return arktypeWrap('"unknown"', schema)
    const notMessage = schema['x-not-message']
    const predicate = (() => {
      const bigint = isBigintFormat(withoutNot)
      const shared = notPredicate(inner, 'data', 'data: unknown', bigint)
      if (shared !== undefined) return shared
      if (Array.isArray(inner.enum)) {
        return `(data: unknown) => !${valueListLiteral(inner.enum, bigint)}.includes(data as never)`
      }
      return undefined
    })()
    // A `type` beside `not` still holds: the predicate narrows that type, not any value.
    if (withoutNot.type !== undefined) {
      const base = arktype(withoutNot, rootName, isArktype, options)
      if (!predicate) return base
      const narrowed =
        isArktype && isArktypeDefinition(base)
          ? `[${base},":",${predicate}]`
          : `${asRuntime(base)}.narrow(${predicate})`
      return notMessage ? describeWithMessage(narrowed, notMessage) : narrowed
    }
    if (!predicate) return arktypeWrap('"unknown"', schema)
    const base = `type("unknown").narrow(${predicate})`
    const expr = notMessage ? `${base}.describe(${JSON.stringify(notMessage)})` : base
    return arktypeWrap(expr, schema)
  }

  if (schema.const !== undefined) {
    // v3.0: x-const-message attaches a `.describe(msg)` to the literal type.
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    // A quote or backslash in the value breaks both the arktype string DSL
    // literal and the surrounding JS string; such consts use the runtime unit form.
    if (typeof schema.const === 'string' && QUOTE_OR_BACKSLASH_PATTERN.test(schema.const)) {
      const unit = `type.unit(${JSON.stringify(schema.const)})`
      return arktypeWrap(
        constMessage ? `${unit}.describe(${JSON.stringify(constMessage)})` : unit,
        schema,
      )
    }
    const constExpr = formatConst(schema.const, isInt64(schema))
    const literal = constMessage
      ? `type(${constExpr}).describe(${JSON.stringify(constMessage)})`
      : constExpr
    const input = literalInput([schema.const])
    return arktypeWrap(input ? wireNumeric(input, literal) : literal, schema)
  }
  if (schema.enum) {
    const values = schema.enum.filter((value) => value !== null)
    const input = values.length > 0 ? literalInput(values) : undefined
    if (input === undefined) return arktypeWrap(_enum(enumWithoutWrappedNull(schema)), schema)
    // `null` is matched ahead of the coercion, which would read it as `0` or `false`.
    const hasNull = values.length < schema.enum.length
    const piped = wireNumeric(input, _enum({ ...schema, enum: values }))
    return arktypeWrap(piped, { ...schema, nullable: hasNull || isNullable(schema) })
  }
  if (schema.properties) {
    return readonly(arktypeWrap(object(schema, rootName, isArktype, options), schema))
  }

  const types = normalizeTypes(schema.type)
  const primitive = (primitiveType: string) => {
    if (primitiveType === 'string') return string(schema)
    if (primitiveType === 'number') {
      const definition = number(schema)
      return isWireCoerced
        ? wireNumeric(numberMorph('isFinite', 'a number'), definition)
        : definition
    }
    if (primitiveType === 'integer') {
      if (isInt64(schema) || schema.format === 'bigint') {
        return integer(schema, { wire: isWireCoerced })
      }
      const definition = integer(schema)
      return isWireCoerced
        ? wireNumeric(numberMorph('isSafeInteger', 'an integer'), definition)
        : definition
    }
    if (primitiveType !== 'boolean') return undefined
    return isWireCoerced ? stringbool() : '"boolean"'
  }
  if (isPrimitiveUnion(types, isWireCoerced)) {
    const members = unionPrimitiveTypes(types, isWireCoerced)
      .map(primitive)
      .filter((m) => m !== undefined)
    return arktypeWrap(unionOf(members, undefined), schema)
  }
  for (const primitiveType of ['string', 'number', 'integer', 'boolean']) {
    if (!types.includes(primitiveType)) continue
    const expression = primitive(primitiveType)
    if (expression !== undefined) return arktypeWrap(expression, schema)
  }

  /**
   * JSON Schema 2020-12 §10.3.1.1: `prefixItems` checks the leading elements only as far as
   * the array goes, so every position is optional (`[def, "?"]`). The elements after it are
   * held to `restSchema`, and are open without it; `false` closes the tuple.
   */
  const prefixTuple = (
    prefixItems: readonly JSONSchema[],
    restSchema: JSONSchema | boolean | undefined,
  ) => {
    const positions = prefixItems.map((s) => `[${arktype(s, rootName, isArktype, options)},"?"]`)
    const rest = isSchemaObject(restSchema)
      ? [`"..."`, restArray(arktype(restSchema, rootName, isArktype, options))]
      : restSchema === false
        ? []
        : [`"..."`, `"unknown[]"`]
    const definition = `[${[...positions, ...rest].join(',')}]`
    // Inside a scope the tuple stays a definition, so the scope resolves an alias in it;
    // the global `type(...)` cannot.
    return describeWithMessage(
      isArktype ? definition : `type(${definition})`,
      schema['x-prefixItems-message'],
    )
  }
  /** An array of the `items` schema, or of `unknown` without one. */
  const itemsArray = () => {
    const itemSchema = itemsSchemaOf(schema.items)
    const items = itemSchema ? arktype(itemSchema, rootName, isArktype, options) : '"unknown"'
    // An item that is an expression rather than a definition — a morph on the wire, a
    // narrowed object — makes the array one too, and its constraints chain onto it. Inside
    // a scope a definition that may name a scope alias stays a tuple expression, which the
    // scope resolves; the global `type(...)` cannot.
    return isPlainOperand(items, true)
      ? `"${items.slice(1, -1)}[]"`
      : isArktype && isArktypeDefinition(items)
        ? `[${items},"[]"]`
        : `type(${items}).array()`
  }

  if (types.includes('array')) {
    // The element list: a `prefixItems` tuple, or an array of the `items` schema.
    const prefixItems = schema.prefixItems ?? []
    // `items` evaluates every element after the prefix (`true` leaves them open), so
    // `unevaluatedItems` holds them only without it (§11.2).
    const isItemsRest = typeof schema.items === 'boolean' || isSchemaObject(schema.items)
    const restSchema = isItemsRest ? schema.items : schema.unevaluatedItems
    // `contains` evaluates the elements it matches too, so beside it an `unevaluatedItems`
    // schema or `false` holds the elements after the prefix to `contains` or to itself: a
    // union rest, unless one side transforms its input, which ArkType cannot union with an
    // overlapping type. Then the rest stays open and a narrow checks it.
    const containsRestMembers =
      prefixItems.length > 0 &&
      !isItemsRest &&
      schema.contains !== undefined &&
      (restSchema === false || isSchemaObject(restSchema))
        ? [schema.contains, ...(isSchemaObject(restSchema) ? [restSchema] : [])]
        : undefined
    const isContainsRestNarrowed =
      containsRestMembers?.some((s) => readsInput(arktype(s, rootName, isArktype, options))) ===
      true
    const restOfTuple =
      containsRestMembers === undefined
        ? restSchema
        : isContainsRestNarrowed
          ? undefined
          : { anyOf: containsRestMembers }
    const base = prefixItems.length > 0 ? prefixTuple(prefixItems, restOfTuple) : itemsArray()
    const isClosedTuple =
      prefixItems.length > 0 && restSchema === false && containsRestMembers === undefined
    const { minItems, maxItems } = schema
    const isFixedLength = hasFixedItemCount(schema)
    // Per-keyword array messages via .narrow() with ctx.mustBe.
    const lengthMessage = schema['x-length-message']
    const minItemsMessage = schema['x-minItems-message'] ?? lengthMessage
    const maxItemsMessage = schema['x-maxItems-message'] ?? lengthMessage
    const uniqueItemsMessage = schema['x-uniqueItems-message']
    const containsMessage = schema['x-contains-message']
    const minContainsMessage = schema['x-minContains-message']
    const maxContainsMessage = schema['x-maxContains-message']
    const fixedItemsMessage = minItemsMessage ?? maxItemsMessage
    // `.some(Boolean)`, not `??`: an empty message is no message, and the branch it
    // guards would emit `ctx.mustBe('')`.
    const hasArrayMessage = [
      minItemsMessage,
      maxItemsMessage,
      uniqueItemsMessage,
      containsMessage,
      minContainsMessage,
      maxContainsMessage,
    ].some(Boolean)
    // ArkType refuses an unsatisfiable intersection when the module loads, so a closed tuple
    // shorter than `minItems` checks the length in a narrow, which rejects every value.
    const isLengthNarrowed =
      hasArrayMessage ||
      (isClosedTuple && typeof minItems === 'number' && minItems > prefixItems.length)
    // `and` / `narrow` on a definition that may name a scope-local alias must
    // stay in definition syntax; the global `type(...)` cannot resolve it.
    const andWith = (a: string, b: string) =>
      isArktype && isArktypeDefinition(a) ? `[${a},"&",${b}]` : `type(${a}).and(type(${b}))`
    const narrowWith = (a: string, narrowing: string) =>
      isArktype && isArktypeDefinition(a)
        ? `[${a},":",${narrowing}]`
        : `${isArktypeDefinition(a) ? `type(${a})` : a}.narrow(${narrowing})`

    const lengthExpr = isFixedLength
      ? isLengthNarrowed
        ? narrowWith(
            base,
            `(data: unknown[], ctx) => data.length === ${minItems} || ctx.mustBe(${JSON.stringify(fixedItemsMessage ?? `must contain exactly ${minItems} items`)})`,
          )
        : andWith(base, `"unknown[] == ${minItems}"`)
      : typeof minItems === 'number' && typeof maxItems === 'number'
        ? isLengthNarrowed
          ? narrowWith(
              narrowWith(
                base,
                `(data: unknown[], ctx) => data.length >= ${minItems} || ctx.mustBe(${JSON.stringify(minItemsMessage ?? `must contain at least ${minItems} items`)})`,
              ),
              `(data: unknown[], ctx) => data.length <= ${maxItems} || ctx.mustBe(${JSON.stringify(maxItemsMessage ?? `must contain at most ${maxItems} items`)})`,
            )
          : andWith(base, `"${minItems} <= unknown[] <= ${maxItems}"`)
        : typeof minItems === 'number'
          ? isLengthNarrowed
            ? narrowWith(
                base,
                `(data: unknown[], ctx) => data.length >= ${minItems} || ctx.mustBe(${JSON.stringify(minItemsMessage ?? `must contain at least ${minItems} items`)})`,
              )
            : andWith(base, `"unknown[] >= ${minItems}"`)
          : typeof maxItems === 'number'
            ? isLengthNarrowed
              ? narrowWith(
                  base,
                  `(data: unknown[], ctx) => data.length <= ${maxItems} || ctx.mustBe(${JSON.stringify(maxItemsMessage ?? `must contain at most ${maxItems} items`)})`,
                )
              : andWith(base, `"unknown[] <= ${maxItems}"`)
            : base
    const uniqueExpr =
      schema.uniqueItems === true
        ? narrowWith(
            lengthExpr,
            `(data: unknown[], ctx) => new Set(data).size === data.length${uniqueItemsMessage ? ` || ctx.mustBe(${JSON.stringify(uniqueItemsMessage)})` : ''}`,
          )
        : lengthExpr
    const containsRt = schema.contains
      ? callbackType(arktype(schema.contains, rootName, isArktype, options), isArktype)
      : undefined
    const unevalItemsMessage = schema['x-unevaluatedItems-message']
    const unevaluatedNarrows = (() => {
      if (!isContainsRestNarrowed || containsRt === undefined) return []
      const restRt = isSchemaObject(restSchema)
        ? ` || ${callbackType(arktype(restSchema, rootName, isArktype, options), isArktype)}.allows(item)`
        : ''
      const msg = unevalItemsMessage ?? 'an array with no unevaluated items'
      return [
        callbackReturn(
          '(data: unknown[], ctx)',
          `data.slice(${prefixItems.length}).every((item) => ${containsRt}.allows(item)${restRt}) || ctx.mustBe(${JSON.stringify(msg)})`,
        ),
      ]
    })()
    const containsNarrows = (() => {
      if (containsRt === undefined) return []
      const minC = schema.minContains
      const maxC = schema.maxContains
      if (minC === undefined && maxC === undefined) {
        const msg = containsMessage ?? 'must contain at least one matching item'
        return [
          callbackReturn(
            '(data: unknown[], ctx)',
            `data.some((item) => ${containsRt}.allows(item)) || ctx.mustBe(${JSON.stringify(msg)})`,
          ),
        ]
      }
      const effectiveMin = minC ?? 1
      const minNarrow =
        effectiveMin > 0
          ? callbackReturn(
              '(data: unknown[], ctx)',
              `data.filter((item) => ${containsRt}.allows(item)).length >= ${effectiveMin} || ctx.mustBe(${JSON.stringify(minContainsMessage ?? `must contain at least ${effectiveMin} matching items`)})`,
            )
          : undefined
      const maxNarrow =
        maxC !== undefined
          ? callbackReturn(
              '(data: unknown[], ctx)',
              `data.filter((item) => ${containsRt}.allows(item)).length <= ${maxC} || ctx.mustBe(${JSON.stringify(maxContainsMessage ?? `must contain at most ${maxC} matching items`)})`,
            )
          : undefined
      return [minNarrow, maxNarrow].filter((v): v is string => v !== undefined)
    })()
    // unevaluatedItems is read by the prefixItems tuple; with `items` alone,
    // JSON Schema 2020-12 §11.3 makes the keyword redundant.
    const arrayExpr = [...containsNarrows, ...unevaluatedNarrows].reduce(
      // Inside a scope a definition keeps its narrows in definition syntax, which the
      // scope resolves.
      (acc, narrow) =>
        isArktype && isArktypeDefinition(acc)
          ? `[${acc},":",${narrow}]`
          : `${asRuntime(acc)}.narrow(${narrow})`,
      uniqueExpr,
    )
    const wrapped = arktypeWrap(
      wireArray(describeWithMessage(arrayExpr, schema['x-items-message'])),
      schema,
    )
    // A tuple closed by `unevaluatedItems: false` reports its own message. An empty message
    // is no message.
    return isClosedTuple && !isItemsRest && unevalItemsMessage
      ? describeWithMessage(wrapped, unevalItemsMessage)
      : wrapped
  }

  if (types.includes('object')) {
    return readonly(arktypeWrap(object(schema, rootName, isArktype, options), schema))
  }
  if (types.includes('date')) {
    if (isWireCoerced) return arktypeWrap('"string.date.parse"', schema)
    return arktypeWrap('"Date"', schema)
  }
  if (types.length === 1 && types[0] === 'null') {
    return arktypeWrap('"null"', schema, { nullSchema: true })
  }

  // An `allOf` member that is only `additionalProperties` still constrains every value.
  if (typeof schema.additionalProperties === 'object') {
    return readonly(arktypeWrap(object(schema, rootName, isArktype, options), schema))
  }

  return arktypeWrap('"unknown"', schema)
}
