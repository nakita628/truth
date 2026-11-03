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
import {
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
} from '../../helper/index.js'
import type { ArktypeWrapOptions } from '../../helper/index.js'
import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { normalizeTypes, resolveOpenAPIRef } from '../../utils/index.js'
import { _enum } from './enum.js'
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

function unionStr(schemas: string[], inScope = false): string {
  return schemas.every(isQuoted)
    ? `"${schemas.map((s) => s.slice(1, -1)).join(' | ')}"`
    : schemas.reduce(combine('|', inScope))
}

function intersectionStr(schemas: string[], inScope = false): string {
  return schemas.every(isQuoted)
    ? `"${schemas.map((s) => s.slice(1, -1)).join(' & ')}"`
    : schemas.reduce(combine('&', inScope))
}

/** An ArkType expression that carries methods: a quoted definition is wrapped in `type(...)`. */
function asRuntime(source: string): string {
  return isQuoted(source) ? `type(${source})` : source
}

/** Whether an expression reads its input through a morph: ArkType cannot union two of them. */
function isMorph(source: string): boolean {
  return source.includes('.pipe(')
}

/**
 * A union of wire members, each a morph over the text, tried in order: ArkType refuses
 * an unordered union of morphs with overlapping inputs, so the first branch that reads
 * the text wins, as `z.union()` reads it.
 */
function wireUnion(schemas: readonly string[], message: string | undefined): string {
  const branches = schemas.map(asRuntime).join(',')
  const expected = JSON.stringify(message ?? 'one of the members')
  return `type("unknown").pipe((data, ctx) => { for (const branch of [${branches}]) { const out = branch(data); if (!(out instanceof type.errors)) return out } return ctx.error(${expected}) })`
}

/** `morph` validated against `inner` after it, unless `inner` is the bare keyword the morph already reads. */
function wireNumeric(morph: string, inner: string): string {
  if (inner === '"number"' || inner === '"number.integer"') return morph
  return isQuoted(inner) ? `${morph}.to(${inner})` : `${morph}.pipe(${inner})`
}

/** The boolean spellings of the wire, read into a boolean as `z.stringbool()` reads them. */
function stringbool(): string {
  return `type(${stringboolPattern()}).pipe((data) => ${stringboolTruthyPattern()}.test(data))`
}

/** A keyword-only `allOf` member: the keywords apply when the value has their type. */
function keywordConstraint(schema: JSONSchema): string {
  const body = constraintPredicate(schema, 'data')
  const message = constraintMessage(schema)
  if (message === undefined) return `type("unknown").narrow((data) => ${body})`
  return `type("unknown").narrow((data, ctx) => (${body}) || ctx.mustBe(${JSON.stringify(message)}))`
}

function formatConst(value: unknown, isBigint: boolean): string {
  if (typeof value === 'string') return `"'${value}'"`
  if (typeof value === 'number' && isBigint) return `"${value}n"`
  if (typeof value === 'number' || typeof value === 'boolean') return `"${String(value)}"`
  if (value !== null && typeof value === 'object') return '"unknown"'
  return `"${JSON.stringify(value) ?? 'null'}"`
}

/** Whether an `allOf` member is a numeric primitive whose constraints can be merged into one definition. */
function isNumericMember(schema: JSONSchema): boolean {
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
function indexKey(source: string): string {
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
): readonly string[] {
  const patternMembers = Object.entries(schema.patternProperties ?? {}).map(
    ([pattern, propSchema]) =>
      `{${indexKey(pattern)}:${arktype(propSchema, rootName, isArktype, options)}}`,
  )
  const unevaluated = schema.unevaluatedProperties
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
): string {
  const codeExtOpts: ArktypeWrapOptions = {
    ...(options?.unsafeCodeExtensions === true && { unsafeCodeExtensions: true }),
    ...(isArktype && { scopeMode: true }),
  }
  const arktypeWrap = (arktypeStr: string, s: JSONSchema): string =>
    _arktypeWrap(arktypeStr, s, codeExtOpts)
  const readonly = (v: string) => (options?.readonly ? `${v}.readonly()` : v)
  const isStringWireParam = isStringWireLocation(options?.paramIn)
  const isWireCoerced = isStringWireParam && schema['x-coerce'] !== false
  const wireArray = (v: string) =>
    isStringWireParam ? arktypePreprocess([wireArrayOnce('data')], v) : v
  // What reads a literal's input into the literal's type: on the wire the text is coerced,
  // and a 64-bit integer is a bigint wherever it comes from.
  const literalInput = (values: readonly unknown[]): string | undefined => {
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
  const describeWithMessage = (expr: string, msg: unknown): string => {
    if (typeof msg !== 'string') return expr
    const text = JSON.stringify(msg)
    if (isArktype && isArktypeDefinition(expr)) return `[${expr},"@",${text}]`
    return `${isQuoted(expr) ? `type(${expr})` : expr}.describe(${text})`
  }
  const unionOf = (schemas: string[], message: string | undefined): string =>
    isWireCoerced && schemas.some(isMorph)
      ? wireUnion(schemas, message)
      : describeWithMessage(unionStr(schemas, isArktype), message)

  if (schema.$ref) {
    // Scope mode (isArktype) resolves refs through `scope({...})` as DSL keywords (`"User"`).
    // Standalone exports (`const X = type(...)`) have no scope, so a cross-schema ref must be a
    // value reference to the imported const (`User`). Self-refs stay quoted: a value ref to the
    // const being defined would hit a TDZ; recursion is only expressible in scope mode.
    const emitRef = (name: string): string => (!isArktype && name !== rootName ? name : `"${name}"`)
    const ref = (s: JSONSchema): string => {
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
      return arktypeWrap(`${ref(items)}.array()`, schema)
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
    const discriminated = discriminatedMembers(schema, schema.oneOf)
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
      const merged = definitions.every(isQuoted)
        ? (() => {
            const parts = definitions
              .map((d) => d.slice(1, -1))
              .filter((d) => d !== 'number' && d !== 'number.integer')
            if (parts.length === 0) return isInteger ? '"number.integer"' : '"number"'
            return `"${parts.join(' & ')}"`
          })()
        : definitions.length === 1
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
      intersected.length === 1 ? intersected[0] : intersectionStr(intersected, isArktype)
    return arktypeWrap(baseResult, { ...schema, nullable })
  }

  if (schema.not) {
    const { not: inner, ...withoutNot } = schema
    if (typeof inner !== 'object' || inner === null) return arktypeWrap('"unknown"', schema)
    const notMessage = schema['x-not-message']
    const predicate = ((): string | undefined => {
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
    if (input === undefined) return arktypeWrap(_enum(schema), schema)
    // `null` is matched ahead of the coercion, which would read it as `0` or `false`.
    const hasNull = values.length < schema.enum.length
    const piped = wireNumeric(input, _enum({ ...schema, enum: values }))
    return arktypeWrap(piped, { ...schema, nullable: hasNull || isNullable(schema) })
  }
  if (schema.properties) {
    return readonly(arktypeWrap(object(schema, rootName, isArktype, options), schema))
  }

  const types = normalizeTypes(schema.type)
  const primitive = (t: string): string | undefined => {
    if (t === 'string') return string(schema)
    if (t === 'number') {
      const definition = number(schema)
      return isWireCoerced
        ? wireNumeric(numberMorph('isFinite', 'a number'), definition)
        : definition
    }
    if (t === 'integer') {
      if (isInt64(schema) || schema.format === 'bigint') {
        return integer(schema, { wire: isWireCoerced })
      }
      const definition = integer(schema)
      return isWireCoerced
        ? wireNumeric(numberMorph('isSafeInteger', 'an integer'), definition)
        : definition
    }
    if (t !== 'boolean') return undefined
    return isWireCoerced ? stringbool() : '"boolean"'
  }
  if (isPrimitiveUnion(types, isWireCoerced)) {
    const members = unionPrimitiveTypes(types, isWireCoerced)
      .map(primitive)
      .filter((m) => m !== undefined)
    return arktypeWrap(unionOf(members, undefined), schema)
  }
  for (const t of ['string', 'number', 'integer', 'boolean']) {
    if (!types.includes(t)) continue
    const expression = primitive(t)
    if (expression !== undefined) return arktypeWrap(expression, schema)
  }

  if (types.includes('array')) {
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => arktype(s, rootName, isArktype, options))
      // JSON Schema 2020-12 §11.3: unevaluatedItems applies to elements beyond
      // prefixItems. ArkType tuples reject extras by default; `unevaluatedItems`
      // as a schema is represented as a trailing variadic `...rest[]`.
      const u = schema.unevaluatedItems
      const tupleExpr = isSchemaObject(u)
        ? (() => {
            const rest = arktype(u, rootName, isArktype, options)
            const restInner = isQuoted(rest) ? rest.slice(1, -1) : rest
            return `type([${items.join(',')},"...","${restInner}[]"])`
          })()
        : `type([${items.join(',')}])`
      const baseTuple = arktypeWrap(
        wireArray(describeWithMessage(tupleExpr, schema['x-prefixItems-message'])),
        schema,
      )
      const unevalItemsMessage = schema['x-unevaluatedItems-message']
      return u === false && unevalItemsMessage
        ? `${baseTuple}.describe(${JSON.stringify(unevalItemsMessage)})`
        : baseTuple
    }
    const itemSchema = itemsSchemaOf(schema.items)
    const items = itemSchema ? arktype(itemSchema, rootName, isArktype, options) : '"unknown"'
    // An item that is an expression rather than a definition — a morph on the wire, a
    // narrowed object — makes the array one too, and its constraints chain onto it.
    const base = isQuoted(items) ? `"${items.slice(1, -1)}[]"` : `type(${items}).array()`
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
    // `and` / `narrow` on a definition that may name a scope-local alias must
    // stay in definition syntax; the global `type(...)` cannot resolve it.
    const andWith = (a: string, b: string) =>
      isArktype && isArktypeDefinition(a) ? `[${a},"&",${b}]` : `type(${a}).and(type(${b}))`
    const narrowWith = (a: string, fn: string) =>
      isArktype && isArktypeDefinition(a)
        ? `[${a},":",${fn}]`
        : `${isArktypeDefinition(a) ? `type(${a})` : a}.narrow(${fn})`

    const lengthExpr = isFixedLength
      ? hasArrayMessage
        ? narrowWith(
            base,
            `(data: unknown[], ctx) => data.length === ${minItems} || ctx.mustBe(${JSON.stringify(fixedItemsMessage ?? `must contain exactly ${minItems} items`)})`,
          )
        : andWith(base, `"unknown[] == ${minItems}"`)
      : typeof minItems === 'number' && typeof maxItems === 'number'
        ? hasArrayMessage
          ? narrowWith(
              narrowWith(
                base,
                `(data: unknown[], ctx) => data.length >= ${minItems} || ctx.mustBe(${JSON.stringify(minItemsMessage ?? `must contain at least ${minItems} items`)})`,
              ),
              `(data: unknown[], ctx) => data.length <= ${maxItems} || ctx.mustBe(${JSON.stringify(maxItemsMessage ?? `must contain at most ${maxItems} items`)})`,
            )
          : andWith(base, `"${minItems} <= unknown[] <= ${maxItems}"`)
        : typeof minItems === 'number'
          ? hasArrayMessage
            ? narrowWith(
                base,
                `(data: unknown[], ctx) => data.length >= ${minItems} || ctx.mustBe(${JSON.stringify(minItemsMessage ?? `must contain at least ${minItems} items`)})`,
              )
            : andWith(base, `"unknown[] >= ${minItems}"`)
          : typeof maxItems === 'number'
            ? hasArrayMessage
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
    const containsNarrows = ((): readonly string[] => {
      if (!schema.contains) return []
      const containsRt = callbackType(
        arktype(schema.contains, rootName, isArktype, options),
        isArktype,
      )
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
    // unevaluatedItems is handled in the prefixItems branch; with `items` alone,
    // JSON Schema 2020-12 §11.3 makes the keyword redundant.
    const arrayExpr = containsNarrows.reduce(
      // Inside a scope a definition keeps its narrows in definition syntax, which the
      // scope resolves.
      (acc, narrow) =>
        isArktype && isArktypeDefinition(acc)
          ? `[${acc},":",${narrow}]`
          : `${asRuntime(acc)}.narrow(${narrow})`,
      uniqueExpr,
    )
    return arktypeWrap(wireArray(describeWithMessage(arrayExpr, schema['x-items-message'])), schema)
  }

  if (types.includes('object')) {
    return readonly(arktypeWrap(object(schema, rootName, isArktype, options), schema))
  }
  if (types.includes('date')) {
    if (isWireCoerced) return arktypeWrap('"string.date.parse"', schema)
    return arktypeWrap('"Date"', schema)
  }
  if (types.length === 1 && types[0] === 'null') return arktypeWrap('"null"', schema)

  // An `allOf` member that is only `additionalProperties` still constrains every value.
  if (typeof schema.additionalProperties === 'object') {
    return readonly(arktypeWrap(object(schema, rootName, isArktype, options), schema))
  }

  return arktypeWrap('"unknown"', schema)
}
