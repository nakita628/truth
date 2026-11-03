import { DEFAULT_ROOT_NAME } from '../../constants/index.js'
import {
  hasFixedItemCount,
  isDefaultOnlyMember,
  isNullable,
  isNullTypeMember,
  isPrimitive,
  isSchemaObject,
  isShapelessMember,
  isStringWireLocation,
} from '../../guard/index.js'
import {
  constraintMessage,
  constraintPredicate,
  deepEqualExpression,
  foldAllOfMembers,
  hasParameterSerialization,
  impliedWireType,
  integerWirePattern,
  isKeywordOnlyMember,
  isNullTextRead,
  isPrimitiveUnion,
  itemsSchemaOf,
  jsLiteral,
  isBigintFormat,
  notPredicate,
  valueListLiteral,
  numberWirePattern,
  parameterReaders,
  refTarget,
  stringboolPattern,
  stringboolTruthyPattern,
  unionPrimitiveTypes,
  valibotWrap as _valibotWrap,
  wireArrayOnce,
  wireNumericKind,
  withoutParameterSerialization,
  evaluatedProperties,
  isEvaluatedKeyExpression,
  discriminatedMembers,
} from '../../helper/index.js'
import type { ValibotWrapOptions } from '../../helper/index.js'
import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import {
  issueMessageExpression,
  normalizeTypes,
  valibotError,
  valibotErrorPart,
  makeSafeKey,
} from '../../utils/index.js'
import { _enum } from './enum.js'
import { int64Input, integer, isInt64 } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

/** `inner` with `prefix` ahead of it in one pipe: an existing pipe is opened, not nested. */
function prependPipe(prefix: readonly string[], inner: string): string {
  if (inner.startsWith('v.pipe(') && inner.endsWith(')')) {
    const body = inner.slice('v.pipe('.length, -1)
    return `v.pipe(${prefix.join(',')},${body})`
  }
  return `v.pipe(${prefix.join(',')},${inner})`
}

/** `inner` with `actions` after it in one pipe: an existing pipe is opened, not nested. */
function appendPipe(inner: string, actions: readonly string[]): string {
  if (inner.startsWith('v.pipe(') && inner.endsWith(')')) {
    const body = inner.slice('v.pipe('.length, -1)
    return `v.pipe(${body},${actions.join(',')})`
  }
  return `v.pipe(${inner},${actions.join(',')})`
}

/**
 * `inner` read after `readers`, each a `(input) => ...` arrow over the raw value, in one
 * pipe: a schema may follow a transform, so an inner pipe is opened rather than nested.
 */
function preprocess(readers: readonly string[], inner: string): string {
  if (readers.length === 0) return inner
  return prependPipe(['v.unknown()', ...readers.map((reader) => `v.transform(${reader})`)], inner)
}

/** The pipe items reading the boolean spellings of the wire into a boolean, as `z.stringbool()` reads them. */
function stringboolItems(errorArg: string): readonly string[] {
  return [
    `v.string(${errorArg})`,
    `v.regex(${stringboolPattern()}${errorArg ? `,${errorArg}` : ''})`,
    `v.transform((input)=>${stringboolTruthyPattern()}.test(input))`,
  ]
}

/** The boolean spellings of the wire, read into a boolean as `z.stringbool()` reads them. */
function stringbool(errorArg: string): string {
  return `v.pipe(${stringboolItems(errorArg).join(',')})`
}

function elementMessageWrap(inner: string, msg: string) {
  const msgExpr = issueMessageExpression(msg)
  return `v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const result=v.safeParse(${inner},dataset.value);if(!result.success){for(const issue of result.issues){if(issue.path&&issue.path.length>0){addIssue({message:${msgExpr},path:issue.path})}else{addIssue({message:issue.message})}}}}),${inner})`
}

/** Add a key's issues (`result`) to the raw check. */
function forwardKeyIssues(message: string | undefined): string {
  return `for(const issue of result.issues){addIssue({message:${message === undefined ? 'issue.message' : JSON.stringify(message)}})}`
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
  isValibot: boolean,
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
        `if(new RegExp(${JSON.stringify(pattern)}).test(k)){const result=v.safeParse(${valibot(propSchema, rootName, isValibot, options)},val);if(!result.success){${forwardKeyIssues(patternMessage)}}}`,
    )
    .join('')
  const message = schema['x-unevaluatedProperties-message']
  const unevaluatedCheck =
    evaluated === undefined
      ? ''
      : `if(!(${isEvaluatedKeyExpression(evaluated, 'k')})){${
          unevaluatedSchema === undefined
            ? `addIssue({message:${message === undefined ? `'Unevaluated property: '+k` : JSON.stringify(message)}})`
            : `const result=v.safeParse(${valibot(unevaluatedSchema, rootName, isValibot, options)},val);if(!result.success){${forwardKeyIssues(message)}}`
        }}`
  return `v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const o=dataset.value;if(typeof o!=='object'||o===null||Array.isArray(o))return;for(const [k,val] of Object.entries(o)){${patternChecks}${unevaluatedCheck}}}),${inner})`
}

/**
 * Generate Valibot schema code from JSON Schema.
 *
 * @example
 * ```ts
 * valibot({ type: 'string' }, 'MySchema') // 'v.string()'
 * ```
 */
export function valibot(
  schema: JSONSchema,
  rootName: string = DEFAULT_ROOT_NAME,
  isValibot = false,
  options?: EmitOptions,
): string {
  // The parameter's serialization reads the root's text; the nodes under it see none.
  if (hasParameterSerialization(options)) {
    const inner = valibot(schema, rootName, isValibot, withoutParameterSerialization(options))
    return preprocess(parameterReaders(schema, options, 'input'), inner)
  }
  return node(schema, rootName, isValibot, options)
}

/** A keyword-only `allOf` member: the keywords apply when the value has their type. */
function keywordConstraint(schema: JSONSchema): string {
  const body = constraintPredicate(schema, 'input')
  return `v.pipe(v.any(),v.check((input) => ${body}${valibotErrorPart(constraintMessage(schema))}))`
}

function node(
  schema: JSONSchema,
  rootName: string,
  isValibot: boolean,
  options: EmitOptions | undefined,
): string {
  const isStringWireParam = isStringWireLocation(options?.paramIn)
  const isWireCoerced = isStringWireParam && schema['x-coerce'] !== false
  const codeExtOpts: ValibotWrapOptions =
    options?.unsafeCodeExtensions === true ? { unsafeCodeExtensions: true } : {}
  // On the wire every node's input is text, so its default is spelled as text, and the
  // text `null` is read ahead of a node that takes `null` but no string.
  const wireOptions = (s: JSONSchema): ValibotWrapOptions => {
    if (!isStringWireParam || s['x-coerce'] === false) return {}
    return { stringWire: true, ...(isNullTextRead(s) && { nullText: true }) }
  }
  const valibotWrap = (valibotStr: string, s: JSONSchema): string =>
    _valibotWrap(valibotStr, s, {
      ...codeExtOpts,
      ...wireOptions(s),
      ...(options?.definitions !== undefined && { definitions: options.definitions }),
    })
  const readonly = (v: string) => (options?.readonly ? `v.pipe(${v},v.readonly())` : v)
  const wireArray = (v: string) => (isStringWireParam ? preprocess([wireArrayOnce('input')], v) : v)
  // What reads a literal's input into the literal's type: on the wire the text is coerced,
  // and a 64-bit integer is a bigint wherever it comes from.
  const literalInput = (values: readonly unknown[]): readonly string[] | undefined => {
    if (values.every((v) => typeof v === 'number')) {
      if (isInt64(schema)) return int64Input(isWireCoerced)
      if (isWireCoerced) {
        const pattern =
          wireNumericKind(schema, values) === 'integer' ? integerWirePattern() : numberWirePattern()
        return ['v.string()', `v.regex(${pattern})`, 'v.transform((input)=>Number(input))']
      }
    }
    if (isWireCoerced && values.every((v) => typeof v === 'boolean')) return stringboolItems('')
    return undefined
  }

  if (schema.$ref) {
    // The expression a `$ref` names, bare: the caller wraps it once with what the node
    // itself carries, a `default` or `nullable` beside the `$ref` included.
    const ref = (s: JSONSchema): string => {
      if (s.$ref === undefined) return 'v.any()'
      const target = refTarget(s.$ref, rootName, isValibot, options?.openapi)
      if (target.kind === 'lazy') return `v.lazy(() => ${target.name})`
      if (target.kind === 'value') return target.name
      return target.kind === 'unknown' ? 'v.unknown()' : 'v.any()'
    }
    const items = itemsSchemaOf(schema.items)
    if (schema.type === 'array' && items?.$ref) {
      return `v.array(${valibotWrap(ref(items), items)})`
    }
    return valibotWrap(ref(schema), schema)
  }

  // On the wire a value is text whatever its schema, so a typeless constraint says which
  // type to read the text as.
  const impliedType = isWireCoerced ? impliedWireType(schema) : undefined
  if (impliedType !== undefined) {
    return node({ ...schema, type: impliedType }, rootName, isValibot, options)
  }

  if (schema.oneOf) {
    if (schema.oneOf.length === 0) return valibotWrap('v.any()', schema)
    const discriminator = schema.discriminator?.propertyName
    const hasRefOrAllOf = schema.oneOf.some((s) => s.$ref !== undefined || s.allOf !== undefined)
    // A referenced member is held to the discriminator values that select it, so members
    // that overlap (subtypes of one base) do not both match.
    const discriminated = hasRefOrAllOf ? discriminatedMembers(schema, schema.oneOf) : undefined
    const schemas = schema.oneOf.map((s, i) => {
      const member = valibot(s, rootName, isValibot, options)
      const values = discriminated?.members[i]?.values
      if (discriminated === undefined || values === undefined) return member
      const literal =
        values.length === 1
          ? `v.literal(${JSON.stringify(values[0])})`
          : `v.picklist(${JSON.stringify(values)})`
      return `v.intersect([${member},v.object({${makeSafeKey(discriminated.propertyName)}:${literal}})])`
    })
    const oneOfMessage = schema['x-oneOf-message']
    const errorPart = valibotErrorPart(oneOfMessage)
    const expr =
      discriminator && !hasRefOrAllOf
        ? `v.variant('${discriminator}',[${schemas.join(',')}]${errorPart})`
        : `v.union([${schemas.join(',')}]${errorPart})`
    return valibotWrap(expr, schema)
  }

  if (schema.anyOf) {
    if (schema.anyOf.length === 0) return valibotWrap('v.any()', schema)
    const schemas = schema.anyOf.map((s) => valibot(s, rootName, isValibot, options))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    const errorPart = valibotErrorPart(anyOfMessage)
    return valibotWrap(`v.union([${schemas.join(',')}]${errorPart})`, schema)
  }

  if (schema.allOf) {
    if (schema.allOf.length === 0) return valibotWrap('v.any()', schema)
    const nullable = isNullable(schema) || schema.allOf.some(isNullTypeMember)
    const defaultValue = schema.allOf.find(isDefaultOnlyMember)?.default
    const schemas = foldAllOfMembers(
      schema.allOf.filter((s) => !isShapelessMember(s)),
      isWireCoerced,
    ).map((s) =>
      isKeywordOnlyMember(s) ? keywordConstraint(s) : valibot(s, rootName, isValibot, options),
    )
    if (schemas.length === 0) return valibotWrap('v.any()', { ...schema, nullable })
    const intersected = schemas.length === 1 ? schemas[0] : `v.intersect([${schemas.join(',')}])`
    const allOfMessage = schema['x-allOf-message']
    const baseResult = allOfMessage
      ? (() => {
          const msgExpr = issueMessageExpression(allOfMessage)
          return `v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const result=v.safeParse(${intersected},dataset.value);if(!result.success){for(const issue of result.issues){addIssue({message:${msgExpr},path:issue.path})}}}),${intersected})`
        })()
      : intersected
    const checked = objectKeysCheck(baseResult, schema, rootName, isValibot, options)
    if (defaultValue !== undefined) {
      const withNullable = nullable ? `v.nullable(${checked})` : checked
      return `v.optional(${withNullable},${jsLiteral(defaultValue)})`
    }
    return valibotWrap(checked, { ...schema, nullable })
  }

  if (schema.not) {
    const { not: inner, ...withoutNot } = schema
    if (typeof inner !== 'object' || inner === null) return valibotWrap('v.any()', schema)
    const notMessage = schema['x-not-message']
    const errorPart = valibotErrorPart(notMessage)
    const predicate = ((): string | undefined => {
      const bigint = isBigintFormat(withoutNot)
      const shared = notPredicate(inner, 'input', 'input', bigint)
      if (shared !== undefined) return shared
      if (Array.isArray(inner.enum)) {
        // `Array<string>.includes(unknown)` is a type error (the custom predicate's
        // `input` is `unknown`); compare via `.some(===)` which accepts any operand.
        return `(input) => !${valueListLiteral(inner.enum, bigint)}.some((item) => item === input)`
      }
      const innerExpr = valibot(inner, rootName, isValibot, options)
      return `(input) => !v.safeParse(${innerExpr},input).success`
    })()
    // A `type` beside `not` still holds: the predicate narrows that type, not any value.
    if (withoutNot.type !== undefined) {
      const base = valibot(withoutNot, rootName, isValibot, options)
      return predicate ? appendPipe(base, [`v.check(${predicate}${errorPart})`]) : base
    }
    if (predicate) return valibotWrap(`v.custom<unknown>(${predicate}${errorPart})`, schema)
    return valibotWrap('v.any()', schema)
  }

  if (schema.const !== undefined) {
    // v3.0: x-const-message overrides x-error-message for `const` mismatch.
    const value = schema.const
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    const msgArg = constMessage ? valibotError(constMessage) : ''
    const errorPart = msgArg ? `,${msgArg}` : ''
    // `v.literal` only accepts string/number/boolean. `null` maps to `v.null()`,
    // and array/object consts to a deep-equality `v.custom` (mirrors zod's
    // `z.custom<T>()` fallback) since Valibot has no literal for them.
    if (value === null) return valibotWrap(`v.null(${msgArg})`, schema)
    const literal =
      typeof value === 'number' && isInt64(schema)
        ? `v.literal(${value}n${errorPart})`
        : isPrimitive(value)
          ? `v.literal(${JSON.stringify(value)}${errorPart})`
          : `v.custom<${JSON.stringify(value)}>((input) => ${deepEqualExpression(value, 'input')}${errorPart})`
    const input = literalInput([value])
    return valibotWrap(input ? prependPipe(input, literal) : literal, schema)
  }
  if (schema.enum) {
    const values = schema.enum.filter((value) => value !== null)
    const input = values.length > 0 ? literalInput(values) : undefined
    if (input === undefined) return valibotWrap(_enum(schema), schema)
    // `null` is matched ahead of the coercion, which would read it as `0` or `false`.
    const hasNull = values.length < schema.enum.length
    const piped = prependPipe(input, _enum({ ...schema, enum: values }))
    return valibotWrap(hasNull && !isNullable(schema) ? `v.nullable(${piped})` : piped, schema)
  }
  if (schema.properties) {
    return readonly(valibotWrap(object(schema, rootName, isValibot, options), schema))
  }

  const types = normalizeTypes(schema.type)
  const primitive = (t: string): string | undefined => {
    if (t === 'string') return string(schema)
    if (t === 'number') return number(schema, { wire: isWireCoerced })
    if (t === 'integer') return integer(schema, { wire: isWireCoerced })
    if (t !== 'boolean') return undefined
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? valibotError(errorMessage) : ''
    return isWireCoerced ? stringbool(errorArg) : `v.boolean(${errorArg})`
  }
  if (isPrimitiveUnion(types, isWireCoerced)) {
    const members = unionPrimitiveTypes(types, isWireCoerced)
      .map(primitive)
      .filter((m) => m !== undefined)
    return valibotWrap(`v.union([${members.join(',')}])`, schema)
  }
  for (const t of ['string', 'number', 'integer', 'boolean']) {
    if (!types.includes(t)) continue
    const expression = primitive(t)
    if (expression !== undefined) return valibotWrap(expression, schema)
  }

  if (types.includes('array')) {
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => valibot(s, rootName, isValibot, options))
      // JSON Schema 2020-12 §11.3: unevaluatedItems applies beyond prefixItems.
      // `v.tuple` accepts extras by default; `v.strictTuple` rejects them.
      // `unevaluatedItems: schema` → `v.tupleWithRest(...)`.
      const u = schema.unevaluatedItems
      const unevaluatedItemsMessage = schema['x-unevaluatedItems-message']
      const unevaluatedItemsArg = valibotErrorPart(unevaluatedItemsMessage)
      const tupleExpr = isSchemaObject(u)
        ? `v.tupleWithRest([${items.join(',')}],${valibot(u, rootName, isValibot, options)})`
        : u === false
          ? `v.strictTuple([${items.join(',')}]${unevaluatedItemsArg})`
          : `v.tuple([${items.join(',')}])`
      const prefixItemsMessage = schema['x-prefixItems-message']
      const wrapped = prefixItemsMessage
        ? elementMessageWrap(tupleExpr, prefixItemsMessage)
        : tupleExpr
      return readonly(valibotWrap(wireArray(wrapped), schema))
    }
    const itemSchema = itemsSchemaOf(schema.items)
    const items = itemSchema ? valibot(itemSchema, rootName, isValibot, options) : 'v.any()'
    const itemsMessage = schema['x-items-message']
    const arrayBase = `v.array(${items})`
    const base = itemsMessage ? elementMessageWrap(arrayBase, itemsMessage) : arrayBase
    const isFixedLength = hasFixedItemCount(schema)
    // Per-keyword messages
    const lengthMessage = schema['x-length-message']
    const minItemsMessage = schema['x-minItems-message'] ?? lengthMessage
    const minArg = valibotErrorPart(minItemsMessage)
    const maxItemsMessage = schema['x-maxItems-message'] ?? lengthMessage
    const maxArg = valibotErrorPart(maxItemsMessage)
    const tupleItemsMessage = minItemsMessage ?? maxItemsMessage
    const sizeArg = valibotErrorPart(tupleItemsMessage)
    const uniqueItemsMessage = schema['x-uniqueItems-message']
    const uniqueArg = valibotErrorPart(uniqueItemsMessage)
    // v3.0: contains / minContains / maxContains as separate checks
    const containsActions = (() => {
      const c = schema.contains
      if (!c) return []
      const containsSchema = valibot(c, rootName, isValibot, options)
      const minC = schema.minContains
      const maxC = schema.maxContains
      const errorMessage = schema['x-error-message']
      const fallback = schema['x-contains-message'] ?? errorMessage
      const out: string[] = []
      if (minC === undefined && maxC === undefined) {
        const containsArg = valibotErrorPart(fallback)
        out.push(
          `v.check((input)=>input.some((item)=>v.safeParse(${containsSchema},item).success)${containsArg})`,
        )
      } else {
        const effectiveMin = minC ?? 1
        if (effectiveMin > 0) {
          const minContainsMessage = schema['x-minContains-message'] ?? fallback
          const minContainsArg = valibotErrorPart(minContainsMessage)
          out.push(
            `v.check((input)=>input.filter((item)=>v.safeParse(${containsSchema},item).success).length>=${effectiveMin}${minContainsArg})`,
          )
        }
        if (maxC !== undefined) {
          const maxContainsMessage = schema['x-maxContains-message'] ?? fallback
          const maxContainsArg = valibotErrorPart(maxContainsMessage)
          out.push(
            `v.check((input)=>input.filter((item)=>v.safeParse(${containsSchema},item).success).length<=${maxC}${maxContainsArg})`,
          )
        }
      }
      return out
    })()
    // unevaluatedItems is handled in the prefixItems branch; with `items` alone,
    // JSON Schema 2020-12 §11.3 makes the keyword redundant.
    const actions = [
      isFixedLength ? `v.length(${schema.minItems}${sizeArg})` : undefined,
      !isFixedLength && typeof schema.minItems === 'number'
        ? `v.minLength(${schema.minItems}${minArg})`
        : undefined,
      !isFixedLength && typeof schema.maxItems === 'number'
        ? `v.maxLength(${schema.maxItems}${maxArg})`
        : undefined,
      schema.uniqueItems === true
        ? `v.check((input) => new Set(input).size === input.length${uniqueArg})`
        : undefined,
      ...containsActions,
    ].filter((v) => v !== undefined)
    const arrayExpr = actions.length > 0 ? `v.pipe(${base},${actions.join(',')})` : base
    return readonly(valibotWrap(wireArray(arrayExpr), schema))
  }

  if (types.includes('object')) {
    return readonly(valibotWrap(object(schema, rootName, isValibot, options), schema))
  }
  if (types.includes('date')) {
    if (isWireCoerced) {
      return valibotWrap(
        `v.pipe(v.string(),v.transform((input)=>new Date(input)),v.date())`,
        schema,
      )
    }
    return valibotWrap('v.date()', schema)
  }
  if (types.length === 1 && types[0] === 'null') return valibotWrap('v.null()', schema)

  // An `allOf` member that is only `additionalProperties` still constrains every value.
  if (typeof schema.additionalProperties === 'object') {
    return readonly(valibotWrap(object(schema, rootName, isValibot, options), schema))
  }

  return valibotWrap('v.any()', schema)
}
