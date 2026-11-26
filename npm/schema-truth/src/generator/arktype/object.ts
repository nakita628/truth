import {
  hasCombinator,
  isArktypeDefinition,
  isObjectPrototypeProperty,
  isStringWireLocation,
  readsObjectKeys,
  readsRecordKeys,
} from '../../guard/index.js'
import {
  arktypePreprocess,
  callbackReturn,
  callbackType,
  evaluatedObjectKeysCheck,
  objectEvaluatedKeys,
  ownProperties,
  propertyEmitOptions,
  propertyNamesKeyCheck,
  withoutShadowedUnevaluated,
} from '../../helper/index.js'
import { regexConstructor } from '../../helper/regex.js'
import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey } from '../../utils/index.js'
import { arktype } from './arktype.js'

/**
 * An object definition with its narrows. Inside a scope they stay in definition syntax
 * (`[def, ":", fn]`), which the scope resolves; outside, they chain on `type(def)`.
 */
function composeNarrows(definition: string, narrows: readonly string[], scopeMode: boolean) {
  if (scopeMode) return narrows.reduce((acc, n) => `[${acc},":",${n}]`, definition)
  return narrows.reduce((acc, n) => `${acc}.narrow(${n})`, `type(${definition})`)
}

/**
 * Compose a `.narrow(...)` argument with an optional error message.
 * - With message: `(data, ctx) => predicate || ctx.mustBe("msg")`
 * - Without message: `(data) => predicate`
 */
function narrowPredicate(predicate: string, message?: string) {
  return message
    ? callbackReturn('(data, ctx)', `${predicate} || ctx.mustBe(${JSON.stringify(message)})`)
    : callbackReturn('(data)', predicate)
}

/**
 * Generate an Arktype object schema for a JSON Schema object node.
 *
 * Combinators (oneOf/anyOf/allOf/not) delegate to the main `arktype` entry.
 * JSON Schema 2020-12 keywords (`minProperties`, `maxProperties`,
 * `propertyNames`, `patternProperties`, `dependentRequired`) are emitted as
 * `.narrow(...)` chains. When narrows are applied, the result is always in
 * wrapped form (`type({...}).narrow(...)`) regardless of `isArktype`.
 */
export function object(
  input: JSONSchema,
  rootName: string,
  isArktype: boolean,
  options?: EmitOptions,
) {
  const schema = withoutShadowedUnevaluated(input)
  if (hasCombinator(schema)) return arktype(schema, rootName, isArktype, options)

  const errorMessage = schema['x-error-message']
  const minimumMessage = schema['x-minProperties-message']
  const maximumMessage = schema['x-maxProperties-message']
  // v3.0: dedicated x-patternProperties-message (split from x-pattern-message)
  const patternPropsMessage = schema['x-patternProperties-message']
  const propNamesMessage = schema['x-propertyNames-message']
  const depReqMessage = schema['x-dependentRequired-message'] ?? errorMessage
  const depSchMessage = schema['x-dependentSchemas-message'] ?? errorMessage
  // x-additionalProperties-message / x-unevaluatedProperties-message: specific
  // keyword takes precedence. ArkType's `type({...})` rejects extras by default,
  // so the narrow fires for the standalone case.
  const addlPropsMessage = schema['x-additionalProperties-message']
  const unevalPropsRawMessage = schema['x-unevaluatedProperties-message']

  const propertyNamesNarrow = () => {
    const check = propertyNamesKeyCheck(schema.propertyNames, 'data')
    return check === undefined ? '' : narrowPredicate(check, propNamesMessage)
  }

  const patternPropertiesNarrows = () =>
    schema.patternProperties
      ? Object.entries(schema.patternProperties).map(([pattern, propSchema]) => {
          const s = callbackType(arktype(propSchema, rootName, isArktype, options), isArktype)
          return narrowPredicate(
            `Object.entries(data).every(([key, value]) => !${regexConstructor(pattern)}.test(key) || ${s}.allows(value))`,
            patternPropsMessage,
          )
        })
      : []

  // ── additionalProperties: schema → type({"[string]": ...}) + propertyNames ──
  // With `properties` or patterns beside it, `additionalProperties` covers only the keys
  // they leave, handled with them below.
  if (
    typeof schema.additionalProperties === 'object' &&
    schema.properties === undefined &&
    !readsRecordKeys(schema)
  ) {
    const innerLiteral = `{"[string]":${arktype(schema.additionalProperties, rootName, isArktype, options)}}`
    const narrows = [propertyNamesNarrow()].filter((a) => a !== '')
    if (narrows.length > 0) return composeNarrows(innerLiteral, narrows, isArktype)
    return isArktype ? innerLiteral : `type(${innerLiteral})`
  }

  const properties = schema.properties ?? {}
  // A required key no property declares only has to be present, with any value.
  const undeclaredRequired = (schema.required ?? []).filter(
    (key) => !Object.hasOwn(properties, key),
  )
  // With no `properties`, an object no keyword reads the keys of is any object, open or not.
  if (!schema.properties && !readsObjectKeys(schema)) return isArktype ? '{}' : 'type({})'

  // A key a declared property or a `patternProperties` pattern covers is evaluated, and for
  // `unevaluatedProperties` one an `if` / `then` / `else` or `dependentSchemas` branch that
  // applies declares.
  const evaluatedKeys = objectEvaluatedKeys(schema, options?.definitions)
  const conditionSchema = schema.if
  const keysCheck = (check: (isEvaluated: string | undefined) => string) =>
    evaluatedObjectKeysCheck(
      evaluatedKeys,
      'key',
      'data',
      () =>
        conditionSchema === undefined
          ? 'false'
          : `${callbackType(arktype(conditionSchema, rootName, isArktype, options), isArktype)}.allows(data)`,
      check,
    )
  const onlyEvaluatedKeys = keysCheck((isEvaluated) =>
    isEvaluated === undefined
      ? 'Object.keys(data).length === 0'
      : `Object.keys(data).every((key) => ${isEvaluated})`,
  )
  // `"+": "reject"` refuses every undeclared key, a key a pattern allows included: with
  // patterns, the narrow below refuses the keys neither covers instead.
  // `"delete"` drops the undeclared keys before a narrow reads them, so an object a keyword
  // reads the keys of keeps them (ArkType's default) for the narrow to see every key.
  const additionalMode =
    schema.additionalProperties === true && !readsObjectKeys(schema)
      ? 'delete'
      : schema.additionalProperties === false && schema.patternProperties === undefined
        ? 'reject'
        : undefined
  const required = new Set(schema.required)
  const props = [
    ...Object.entries(properties)
      .map(([key, propSchema]) => {
        const parsed = arktype(
          propSchema,
          rootName,
          isArktype,
          propertyEmitOptions(key, propSchema, options) ?? options,
        )
        if (!parsed) return null
        const isRequired = required.has(key)
        const baseSafeKey = makeSafeKey(key)
        const safeKey = isRequired
          ? baseSafeKey
          : baseSafeKey.startsWith('"')
            ? JSON.stringify(`${key}?`)
            : `"${key}?"`
        return `${safeKey}:${parsed}`
      })
      .filter((p) => p !== null),
    ...undeclaredRequired.map((key) => `${makeSafeKey(key)}:"unknown"`),
  ]
  const additionalProp = additionalMode ? `"+":"${additionalMode}"` : undefined
  const allProps = [...props, additionalProp].filter((p) => p !== undefined)

  const innerLiteral = `{${allProps.join(',')}}`

  const minPropertiesNarrow =
    typeof schema.minProperties === 'number'
      ? narrowPredicate(`Object.keys(data).length >= ${schema.minProperties}`, minimumMessage)
      : ''
  const maxPropertiesNarrow =
    typeof schema.maxProperties === 'number'
      ? narrowPredicate(`Object.keys(data).length <= ${schema.maxProperties}`, maximumMessage)
      : ''
  const dependentRequiredNarrows: readonly string[] = schema.dependentRequired
    ? Object.entries(schema.dependentRequired)
        // An empty list always holds.
        .filter(([, deps]) => deps.length > 0)
        .map(([key, deps]) => {
          const depsCheck = deps
            .map((dependency) => `Object.hasOwn(data,${JSON.stringify(dependency)})`)
            .join(' && ')
          return narrowPredicate(
            `!Object.hasOwn(data,${JSON.stringify(key)}) || (${depsCheck})`,
            depReqMessage,
          )
        })
    : []
  // v3.0: dependentSchemas — when key present, the whole object must
  // additionally satisfy the named sub-schema.
  const dependentSchemasNarrows: readonly string[] = schema.dependentSchemas
    ? Object.entries(schema.dependentSchemas).map(([key, subSchema]) => {
        const s = callbackType(arktype(subSchema, rootName, isArktype, options), isArktype)
        return narrowPredicate(
          `!Object.hasOwn(data,${JSON.stringify(key)}) || ${s}.allows(data)`,
          depSchMessage,
        )
      })
    : []
  // v3.0: x-additionalProperties-message narrows extras-rejection
  // when additionalProperties: false.
  const additionalPropertiesNarrow =
    schema.additionalProperties === false &&
    (addlPropsMessage !== undefined || schema.patternProperties !== undefined)
      ? narrowPredicate(onlyEvaluatedKeys, addlPropsMessage)
      : ''
  const unevaluatedPropertiesNarrow = (() => {
    // `additionalProperties` as a schema holds the keys no property or pattern covers, as
    // `unevaluatedProperties` does here.
    const restSchema =
      typeof schema.additionalProperties === 'object'
        ? schema.additionalProperties
        : schema.unevaluatedProperties
    if (restSchema === undefined || restSchema === true) return ''
    const message =
      typeof schema.additionalProperties === 'object' ? addlPropsMessage : unevalPropsRawMessage
    if (restSchema === false) {
      return narrowPredicate(onlyEvaluatedKeys, message)
    }
    if (typeof restSchema === 'object') {
      const s = callbackType(arktype(restSchema, rootName, isArktype, options), isArktype)
      return narrowPredicate(
        keysCheck((isEvaluated) =>
          isEvaluated === undefined
            ? `Object.values(data).every((value) => ${s}.allows(value))`
            : `Object.entries(data).every(([key, value]) => ${isEvaluated} || ${s}.allows(value))`,
        ),
        message,
      )
    }
    return ''
  })()

  const ifThenElseNarrows = (() => {
    if (!schema.if) return []
    const ifS = callbackType(arktype(schema.if, rootName, isArktype, options), isArktype)
    const thenS = schema.then
      ? callbackType(arktype(schema.then, rootName, isArktype, options), isArktype)
      : undefined
    const elseS = schema.else
      ? callbackType(arktype(schema.else, rootName, isArktype, options), isArktype)
      : undefined
    if (!thenS && !elseS) return []
    const ifMessage = schema['x-if-message']
    const thenMessage = schema['x-then-message'] ?? ifMessage
    const elseMessage = schema['x-else-message'] ?? ifMessage
    const parts: string[] = []
    if (thenS) {
      parts.push(narrowPredicate(`!${ifS}.allows(data) || ${thenS}.allows(data)`, thenMessage))
    }
    if (elseS) {
      parts.push(narrowPredicate(`${ifS}.allows(data) || ${elseS}.allows(data)`, elseMessage))
    }
    return parts
  })()

  const narrows = [
    minPropertiesNarrow,
    maxPropertiesNarrow,
    propertyNamesNarrow(),
    ...patternPropertiesNarrows(),
    ...dependentRequiredNarrows,
    ...dependentSchemasNarrows,
    additionalPropertiesNarrow,
    unevaluatedPropertiesNarrow,
    ...ifThenElseNarrows,
  ].filter((a) => a !== '')

  const baseExpr =
    narrows.length > 0
      ? composeNarrows(innerLiteral, narrows, isArktype)
      : isArktype
        ? innerLiteral
        : `type(${innerLiteral})`
  const propsMessage = schema['x-properties-message']
  const described = (() => {
    if (typeof propsMessage !== 'string') return baseExpr
    if (isArktype && isArktypeDefinition(baseExpr)) {
      return `[${baseExpr},"@",${JSON.stringify(propsMessage)}]`
    }
    const wrapped = isArktypeDefinition(baseExpr) ? `type(${baseExpr})` : baseExpr
    return `${wrapped}.describe(${JSON.stringify(propsMessage)})`
  })()
  // A parameter object answers an `Object.prototype` name it was not sent with the
  // inherited member, so it is copied onto a null-prototype object before the check, and
  // back onto a plain one after it.
  const hasInheritedName = Object.keys(properties).some(isObjectPrototypeProperty)
  return isStringWireLocation(options?.paramIn) && hasInheritedName
    ? `${arktypePreprocess([ownProperties('data')], described, 'object')}.pipe((data) => ({ ...data }))`
    : described
}
