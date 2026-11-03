import { DEFAULT_ROOT_NAME } from '../../constants/index.js'
import {
  isDefaultOnlyMember,
  isNullTypeMember,
  isNullable,
  isPrimitive,
  isSchemaObject,
  isShapelessMember,
  isStringWireLocation,
} from '../../guard/index.js'
import {
  constraintMessage,
  constraintPredicate,
  deepEqualExpression,
  discriminatedMembers,
  evaluatedProperties,
  foldAllOfMembers,
  impliedWireType,
  isKeywordOnlyMember,
  isNullMatchedFirst,
  isNullTextRead,
  isPrimitiveUnion,
  itemsSchemaOf,
  isBigintFormat,
  isEvaluatedKeyExpression,
  notPredicate,
  valueListLiteral,
  refTarget,
  unionPrimitiveTypes,
  wireArrayOnce,
  wireNullText,
  wireNumericKind,
  zodWrap as _zodWrap,
} from '../../helper/index.js'
import type { CodeExtensionOptions } from '../../helper/index.js'
import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import {
  issueMessageExpression,
  makeSafeKey,
  normalizeTypes,
  zodError,
  zodErrorPart,
} from '../../utils/index.js'
import { _enum } from './enum.js'
import { int64Input, integer, isInt64 } from './integer.js'
import { number, zodWireNumber } from './number.js'
import { object } from './object.js'
import { parameter, hasParameterSerialization, withoutParameterSerialization } from './parameter.js'
import { string } from './string.js'

/**
 * Zod v4 issue codes, in the order `zod/v4/core/errors.d.ts` declares them. The
 * `x-allOf-message` wrapper matches each in turn and replaces its message.
 */
const ZOD_ISSUE_CODES = [
  'invalid_type',
  'too_big',
  'too_small',
  'invalid_format',
  'not_multiple_of',
  'unrecognized_keys',
  'invalid_union',
  'invalid_key',
  'invalid_element',
  'invalid_value',
  'custom',
] as const

/**
 * The `not` predicate of an inner schema, as the source of a `(val) => ...` arrow, or
 * `undefined` when the inner schema has none this generator can express.
 */
function zodNotPredicate(inner: JSONSchema, parent: JSONSchema): string | undefined {
  if (inner.$ref) return undefined
  const bigint = isBigintFormat(parent)
  const shared = notPredicate(inner, 'val', 'val', bigint)
  if (shared !== undefined) return shared
  if (Array.isArray(inner.enum)) {
    return `(val) => !${valueListLiteral(inner.enum, bigint)}.includes(val)`
  }
  if (inner.oneOf || inner.anyOf || inner.allOf) {
    return `(val) => !${zod(inner)}.safeParse(val).success`
  }
  return undefined
}

/**
 * Re-push `issue` into `ctx` with `message`. Each issue code is narrowed first: the union of
 * parsed issues does not type-check as a raw issue, while each member does.
 */
export function forwardIssue(message: string): string {
  return ZOD_ISSUE_CODES.map(
    (c, i) =>
      `${i === 0 ? '' : 'else '}if(issue.code==='${c}'){ctx.issues.push({...issue,input:issue.input,message:${message}})}`,
  ).join('')
}

/** A message for the issues under the value (with a path); the root's own issues keep theirs. */
export function nestedIssueMessageWrap(inner: string, msg: string): string {
  const msgExpr = `issue.path.length>0?${issueMessageExpression(msg)}:issue.message`
  return `(()=>{const Schema=${inner};return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){${forwardIssue(msgExpr)}}}}).pipe(Schema)})()`
}

function elementMessageWrap(inner: string, msg: string) {
  return nestedIssueMessageWrap(inner, msg)
}

/**
 * Generate Zod schema code from JSON Schema.
 *
 * @example
 * ```ts
 * zod({ type: 'string' }, 'MySchema') // 'z.string()'
 * ```
 */
export function zod(
  schema: JSONSchema,
  rootName: string = DEFAULT_ROOT_NAME,
  isZod = false,
  options?: EmitOptions,
): string {
  // The parameter's serialization reads the root's text; the nodes under it see none.
  if (hasParameterSerialization(options)) {
    const inner = zod(schema, rootName, isZod, withoutParameterSerialization(options))
    return parameter(schema, inner, options)
  }
  const expression = node(schema, rootName, isZod, options)
  const isWireCoerced = isStringWireLocation(options?.paramIn) && schema['x-coerce'] !== false
  if (!isWireCoerced || !isNullTextRead(schema)) return expression
  const nullFirst = isNullMatchedFirst(schema) ? expression : `${expression}.nullable()`
  return `z.preprocess(${wireNullText('val')},${nullFirst})`
}

/** A keyword-only `allOf` member: the keywords apply when the value has their type. */
function keywordConstraint(schema: JSONSchema): string {
  const body = constraintPredicate(schema, 'val')
  return `z.any().refine((val) => ${body}${zodErrorPart(constraintMessage(schema))})`
}

/** Push a key's issues (`result`, for the value `v` under key `k`) under that key. */
function forwardKeyIssues(message: string | undefined): string {
  return `for(const issue of result.error.issues){ctx.issues.push({code:'custom',input:v,path:[k,...issue.path],message:${message === undefined ? 'issue.message' : JSON.stringify(message)}})}`
}

/**
 * An `allOf` with `patternProperties` or `unevaluatedProperties` beside it: the members'
 * objects strip what they do not declare, so the keys are checked on the input before it
 * is parsed — a key a pattern matches against that pattern's schema, a key no member
 * evaluates against `unevaluatedProperties`. `inner` as given when there is nothing to check.
 */
function objectKeysCheck(
  inner: string,
  schema: JSONSchema,
  rootName: string,
  isZod: boolean,
  options: EmitOptions | undefined,
): string {
  const patterns = Object.entries(schema.patternProperties ?? {})
  const unevaluated = schema.unevaluatedProperties
  const unevaluatedSchema = typeof unevaluated === 'object' ? unevaluated : undefined
  const evaluated =
    unevaluated === false || unevaluatedSchema !== undefined
      ? evaluatedProperties(schema, options?.definitions)
      : undefined
  if (patterns.length === 0 && evaluated === undefined) return inner
  const patternMessage = schema['x-patternProperties-message']
  const patternChecks = patterns
    .map(
      ([pattern, propSchema]) =>
        `if(new RegExp(${JSON.stringify(pattern)}).test(k)){const result=${zod(propSchema, rootName, isZod, options)}.safeParse(v);if(!result.success){${forwardKeyIssues(patternMessage)}}}`,
    )
    .join('')
  const message = schema['x-unevaluatedProperties-message']
  const unevaluatedCheck =
    evaluated === undefined
      ? ''
      : `if(!(${isEvaluatedKeyExpression(evaluated, 'k')})){${
          unevaluatedSchema === undefined
            ? `ctx.issues.push({code:'custom',input:o,path:[k],message:${message === undefined ? '`Unrecognized key: "${k}"`' : JSON.stringify(message)}})`
            : `const result=${zod(unevaluatedSchema, rootName, isZod, options)}.safeParse(v);if(!result.success){${forwardKeyIssues(message)}}`
        }}`
  return `(()=>{const Schema=${inner};return z.unknown().check((ctx)=>{const o=ctx.value;if(typeof o!=='object'||o===null||Array.isArray(o))return;for(const [k,v] of Object.entries(o)){${patternChecks}${unevaluatedCheck}}}).pipe(Schema)})()`
}

function node(
  schema: JSONSchema,
  rootName: string,
  isZod: boolean,
  options: EmitOptions | undefined,
): string {
  const isStringWireParam = isStringWireLocation(options?.paramIn)
  const isWireCoerced = isStringWireParam && schema['x-coerce'] !== false
  const codeExtOpts: CodeExtensionOptions =
    options?.unsafeCodeExtensions === true ? { unsafeCodeExtensions: true } : {}
  const zodWrap = (zodStr: string, s: JSONSchema): string =>
    _zodWrap(zodStr, s, {
      ...codeExtOpts,
      ...(options?.definitions !== undefined && { definitions: options.definitions }),
    })
  const readonly = (v: string) => (options?.readonly ? `${v}.readonly()` : v)
  const wireArray = (v: string) =>
    isStringWireParam ? `z.preprocess(${wireArrayOnce('val')},${v})` : v
  // What reads a literal's input into the literal's type: on the wire the text is coerced,
  // and a 64-bit integer is a bigint wherever it comes from.
  const literalInput = (values: readonly unknown[]): string | undefined => {
    if (values.every((v) => typeof v === 'number')) {
      if (isInt64(schema)) return int64Input(isWireCoerced)
      if (isWireCoerced) return zodWireNumber(wireNumericKind(schema, values))
    }
    if (isWireCoerced && values.every((v) => typeof v === 'boolean')) return 'z.stringbool()'
    return undefined
  }
  // The expression a `$ref` names, bare: the caller wraps it once with what the node
  // itself carries, a `default` or `nullable` beside the `$ref` included.
  const ref = (s: JSONSchema, rn: string, iz: boolean): string => {
    if (s.$ref === undefined) return 'z.any()'
    const target = refTarget(s.$ref, rn, iz, options?.openapi)
    if (target.kind === 'lazy') return `z.lazy(() => ${target.name})`
    if (target.kind === 'value') return target.name
    return target.kind === 'unknown' ? 'z.unknown()' : 'z.any()'
  }

  if (schema.$ref) {
    const items = itemsSchemaOf(schema.items)
    if (schema.type === 'array' && items?.$ref) {
      return `z.array(${zodWrap(ref(items, rootName, isZod), items)})`
    }
    return zodWrap(ref(schema, rootName, isZod), schema)
  }

  // On the wire a value is text whatever its schema, so a typeless constraint says which
  // type to read the text as.
  const impliedType = isWireCoerced ? impliedWireType(schema) : undefined
  if (impliedType !== undefined) {
    return node({ ...schema, type: impliedType }, rootName, isZod, options)
  }

  if (schema.oneOf) {
    if (schema.oneOf.length === 0) return zodWrap('z.any()', schema)
    const discriminator = schema.discriminator?.propertyName
    // ZodIntersection (from allOf) is not compatible with discriminatedUnion, so
    // fall back to xor when oneOf contains a $ref or allOf member.
    const hasRefOrAllOf = schema.oneOf.some((s) => s.$ref !== undefined || s.allOf !== undefined)
    // A referenced member is held to the discriminator values that select it, so members
    // that overlap (subtypes of one base) do not both match.
    const discriminated = hasRefOrAllOf ? discriminatedMembers(schema, schema.oneOf) : undefined
    const schemas = schema.oneOf.map((s, i) => {
      const member = zod(s, rootName, isZod, options)
      const values = discriminated?.members[i]?.values
      if (discriminated === undefined || values === undefined) return member
      const literal =
        values.length === 1
          ? `z.literal(${JSON.stringify(values[0])})`
          : `z.enum(${JSON.stringify(values)})`
      return `z.intersection(${member},z.object({${makeSafeKey(discriminated.propertyName)}:${literal}}))`
    })
    const oneOfMessage = schema['x-oneOf-message']
    const errorPart = zodErrorPart(oneOfMessage)
    // The text `1` is both a number and a stringbool once coerced, so on the wire the
    // first member that reads it wins rather than every match failing the other.
    const z =
      discriminator && !hasRefOrAllOf
        ? `z.discriminatedUnion('${discriminator}',[${schemas.join(',')}]${errorPart})`
        : isWireCoerced
          ? `z.union([${schemas.join(',')}]${errorPart})`
          : `z.xor([${schemas.join(',')}]${errorPart})`
    return zodWrap(z, schema)
  }

  if (schema.anyOf) {
    if (schema.anyOf.length === 0) return zodWrap('z.any()', schema)
    const schemas = schema.anyOf.map((s) => zod(s, rootName, isZod, options))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    const errorPart = zodErrorPart(anyOfMessage)
    return zodWrap(`z.union([${schemas.join(',')}]${errorPart})`, schema)
  }

  if (schema.allOf) {
    if (schema.allOf.length === 0) return zodWrap('z.any()', schema)
    const nullable = isNullable(schema) || schema.allOf.some(isNullTypeMember)
    const defaultValue = schema.allOf.find(isDefaultOnlyMember)?.default
    const schemas = foldAllOfMembers(
      schema.allOf.filter((s) => !isShapelessMember(s)),
      isWireCoerced,
    ).map((s) => (isKeywordOnlyMember(s) ? keywordConstraint(s) : zod(s, rootName, isZod, options)))
    if (schemas.length === 0) return zodWrap('z.any()', { ...schema, nullable })
    const intersected =
      schemas.length === 1 ? schemas[0] : schemas.reduce((acc, s) => `z.intersection(${acc},${s})`)
    const allOfMessage = schema['x-allOf-message']
    const baseResult = allOfMessage
      ? (() => {
          const msgExpr = issueMessageExpression(allOfMessage)
          const branches = forwardIssue(msgExpr)
          return `(()=>{const Schema=${intersected};return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){${branches}}}}).pipe(Schema)})()`
        })()
      : intersected
    const checked = objectKeysCheck(baseResult, schema, rootName, isZod, options)
    // Carry the default through `merged` so zodWrap applies `.nullable()` before
    // `.default()`; a `default: null` is only valid against the nullable type.
    const mergedDefault = defaultValue !== undefined ? defaultValue : schema.default
    const merged: JSONSchema = {
      ...schema,
      nullable,
      ...(mergedDefault !== undefined && { default: mergedDefault }),
    }
    return zodWrap(checked, merged)
  }

  if (schema.not) {
    const notMessage = schema['x-not-message']
    const errorPart = zodErrorPart(notMessage)
    const { not: inner, ...withoutNot } = schema
    if (typeof inner !== 'object' || inner === null) return zodWrap('z.any()', schema)
    const predicate = inner.$ref
      ? `(val) => !${ref(inner, '', false)}.safeParse(val).success`
      : zodNotPredicate(inner, withoutNot)
    // A `type` beside `not` still holds: the predicate narrows that type, not any value.
    if (withoutNot.type !== undefined) {
      const base = zod(withoutNot, rootName, isZod, options)
      return predicate ? `${base}.refine(${predicate}${errorPart})` : base
    }
    if (predicate) return zodWrap(`z.any().refine(${predicate}${errorPart})`, schema)
    return zodWrap('z.any()', schema)
  }

  if (schema.const !== undefined) {
    const value = schema.const
    // v3.0: x-const-message overrides x-error-message for `const` mismatch.
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    const errorPart = zodErrorPart(constMessage)
    const literal =
      typeof value === 'number' && isInt64(schema)
        ? `z.literal(${value}n${errorPart})`
        : isPrimitive(value)
          ? `z.literal(${JSON.stringify(value)}${errorPart})`
          : `z.custom<${JSON.stringify(value)}>((input) => ${deepEqualExpression(value, 'input')}${errorPart})`
    const input = literalInput([value])
    return zodWrap(input ? `${input}.pipe(${literal})` : literal, schema)
  }
  if (schema.enum) {
    const values = schema.enum.filter((value) => value !== null)
    const input = values.length > 0 ? literalInput(values) : undefined
    if (input === undefined) return zodWrap(_enum(schema), schema)
    // `null` is matched ahead of the coercion, which would read it as `0` or `false`.
    const hasNull = values.length < schema.enum.length
    const piped = `${input}.pipe(${_enum({ ...schema, enum: values })})`
    return zodWrap(hasNull && !isNullable(schema) ? `${piped}.nullable()` : piped, schema)
  }
  if (schema.properties) return readonly(zodWrap(object(schema, rootName, isZod, options), schema))

  const types = normalizeTypes(schema.type)
  const primitive = (t: string): string | undefined => {
    if (t === 'string') return string(schema)
    if (t === 'number') return number(schema, { wire: isWireCoerced })
    if (t === 'integer') return integer(schema, { wire: isWireCoerced })
    if (t !== 'boolean') return undefined
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    if (isStringWireParam) {
      return `z.stringbool(${errorArg ? `{error:${errorArg.replaceAll(/^{error:|}$/g, '')}}` : ''})`
    }
    const coercePrefix = schema['x-coerce'] === true ? 'coerce.' : ''
    return `z.${coercePrefix}boolean(${errorArg})`
  }
  if (isPrimitiveUnion(types, isWireCoerced)) {
    const members = unionPrimitiveTypes(types, isWireCoerced)
      .map(primitive)
      .filter((m) => m !== undefined)
    return zodWrap(`z.union([${members.join(',')}])`, schema)
  }
  for (const t of ['string', 'number', 'integer', 'boolean']) {
    if (!types.includes(t)) continue
    const expression = primitive(t)
    if (expression !== undefined) return zodWrap(expression, schema)
  }

  if (types.includes('array')) {
    const errorMessage = schema['x-error-message']
    const baseError = zodErrorPart(errorMessage)
    const lengthMessage = schema['x-length-message']
    const minItemsMessage = schema['x-minItems-message'] ?? lengthMessage
    const minError = zodErrorPart(minItemsMessage)
    const maxItemsMessage = schema['x-maxItems-message'] ?? lengthMessage
    const maxError = zodErrorPart(maxItemsMessage)
    const fixedItemsMessage = minItemsMessage ?? maxItemsMessage
    const fixedItemsError = zodErrorPart(fixedItemsMessage)
    const uniqueMessage = schema['x-uniqueItems-message']
    const uniqueError = zodErrorPart(uniqueMessage)
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => zod(s, rootName, isZod, options))
      // JSON Schema 2020-12 §11.3: unevaluatedItems applies to elements beyond
      // prefixItems. With `false` we keep the fixed tuple (default rejects extras);
      // with a schema we emit a rest argument (`z.tuple([...], rest)`).
      const u = schema.unevaluatedItems
      const unevaluatedItemsMessage = schema['x-unevaluatedItems-message']
      const unevaluatedItemsError = zodErrorPart(unevaluatedItemsMessage)
      const rest = isSchemaObject(u) ? zod(u, rootName, isZod, options) : undefined
      const tupleArgs = rest ? `[${items.join(',')}],${rest}` : `[${items.join(',')}]`
      const tupleError = u === false && unevaluatedItemsMessage ? unevaluatedItemsError : baseError
      const tupleExpr = `z.tuple(${tupleArgs}${tupleError})`
      const prefixItemsMessage = schema['x-prefixItems-message']
      const wrapped = prefixItemsMessage
        ? elementMessageWrap(tupleExpr, prefixItemsMessage)
        : tupleExpr
      return readonly(zodWrap(wireArray(wrapped), schema))
    }
    // Draft-04 spelled a tuple as `items: [schema, ...]`; its first member stands for all.
    const itemSchema = itemsSchemaOf(schema.items)
    const item = itemSchema ? zod(itemSchema, rootName, isZod, options) : 'z.any()'
    const itemsMessage = schema['x-items-message']
    const arrayBase = `z.array(${item}${baseError})`
    const base = itemsMessage ? elementMessageWrap(arrayBase, itemsMessage) : arrayBase
    const unique =
      schema.uniqueItems === true
        ? `.refine((val)=>new Set(val).size===val.length${uniqueError})`
        : ''
    // v3.0: contains / minContains / maxContains as separate refines for
    // independent error messages (silent-bug fix).
    const containsChain = (() => {
      const c = schema.contains
      if (!c) return ''
      const containsZod = zod(c, rootName, isZod, options)
      const minC = schema.minContains
      const maxC = schema.maxContains
      const fallback = schema['x-contains-message'] ?? errorMessage
      const parts: string[] = []
      if (minC === undefined && maxC === undefined) {
        const containsArg = zodErrorPart(fallback)
        parts.push(
          `.refine((val)=>{const Schema=${containsZod};return val.some((item)=>Schema.safeParse(item).success)}${containsArg})`,
        )
      } else {
        const effectiveMin = minC ?? 1
        if (effectiveMin > 0) {
          const minContainsMessage = schema['x-minContains-message'] ?? fallback
          const minContainsArg = zodErrorPart(minContainsMessage)
          parts.push(
            `.refine((val)=>{const Schema=${containsZod};return val.filter((item)=>Schema.safeParse(item).success).length>=${effectiveMin}}${minContainsArg})`,
          )
        }
        if (maxC !== undefined) {
          const maxContainsMessage = schema['x-maxContains-message'] ?? fallback
          const maxContainsArg = zodErrorPart(maxContainsMessage)
          parts.push(
            `.refine((val)=>{const Schema=${containsZod};return val.filter((item)=>Schema.safeParse(item).success).length<=${maxC}}${maxContainsArg})`,
          )
        }
      }
      return parts.join('')
    })()
    const { minItems, maxItems } = schema
    // unevaluatedItems is handled in the prefixItems branch; with a single
    // `items` schema (no prefixItems), JSON Schema 2020-12 §11.3 makes the
    // keyword redundant — items already validates every element.
    const arrayExpr =
      typeof minItems === 'number' && typeof maxItems === 'number'
        ? minItems === maxItems
          ? `${base}.length(${minItems}${fixedItemsError})${unique}${containsChain}`
          : `${base}.min(${minItems}${minError}).max(${maxItems}${maxError})${unique}${containsChain}`
        : typeof minItems === 'number'
          ? `${base}.min(${minItems}${minError})${unique}${containsChain}`
          : typeof maxItems === 'number'
            ? `${base}.max(${maxItems}${maxError})${unique}${containsChain}`
            : `${base}${unique}${containsChain}`
    return readonly(zodWrap(wireArray(arrayExpr), schema))
  }

  if (types.includes('object')) {
    return readonly(zodWrap(object(schema, rootName, isZod, options), schema))
  }
  if (types.includes('date')) {
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    const coercePrefix = schema['x-coerce'] === true || isStringWireParam ? 'coerce.' : ''
    return zodWrap(`z.${coercePrefix}date(${errorArg})`, schema)
  }
  if (types.length === 1 && types[0] === 'null') {
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    return zodWrap(`z.null(${errorArg})`, schema)
  }

  // An `allOf` member that is only `additionalProperties` still constrains every value.
  if (typeof schema.additionalProperties === 'object') {
    return readonly(zodWrap(object(schema, rootName, isZod, options), schema))
  }

  return zodWrap('z.any()', schema)
}
