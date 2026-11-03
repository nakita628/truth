import {
  hasCombinator,
  hasConditional,
  isObjectPrototypeProperty,
  isStringWireLocation,
} from '../../guard/index.js'
import {
  effectPreprocess,
  isEvaluatedKeyExpression,
  ownProperties,
  propertyEmitOptions,
} from '../../helper/index.js'
import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { effectError, effectErrorPart, makeSafeKey } from '../../utils/index.js'
import { effect, wholeValueMessage } from './effect.js'

/**
 * Generate an Effect Schema object node.
 *
 * Dispatches `additionalProperties` to `Schema.Record` (Schema), `Schema.Struct`
 * (otherwise). Combinators (oneOf/anyOf/allOf/not) delegate to the main
 * `effect` entry. JSON Schema 2020-12 keywords (`minProperties`,
 * `maxProperties`, `propertyNames`, `patternProperties`, `dependentRequired`)
 * become `Schema.makeFilter(...)` filters passed to the schema's `.check(...)`.
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean,
  options?: EmitOptions,
) {
  if (hasCombinator(schema)) return effect(schema, rootName, isEffect, options)

  const errorMessage = schema['x-error-message']
  const errorArg = effectErrorPart(errorMessage)
  const minimumMessage = schema['x-minProperties-message']
  const minErrorArg = effectErrorPart(minimumMessage)
  const maximumMessage = schema['x-maxProperties-message']
  const maxErrorArg = effectErrorPart(maximumMessage)
  // v3.0: 1 keyword = 1 message
  const patternPropsMessage = schema['x-patternProperties-message']
  const patternErrorArg = effectErrorPart(patternPropsMessage)
  const propNamesMessage = schema['x-propertyNames-message']
  const propNamesErrorArg = effectErrorPart(propNamesMessage)
  const depReqMessage = schema['x-dependentRequired-message']
  const depReqErrorArg = depReqMessage ? `,${effectError(depReqMessage)}` : errorArg
  const depSchMessage = schema['x-dependentSchemas-message']
  const depSchErrorArg = depSchMessage ? `,${effectError(depSchMessage)}` : errorArg
  // x-additionalProperties-message / x-unevaluatedProperties-message: specific
  // keyword takes precedence (additionalProperties > unevaluatedProperties).
  const addlPropsMessage = schema['x-additionalProperties-message']
  const unevalPropsMessage =
    schema.unevaluatedProperties === false ? schema['x-unevaluatedProperties-message'] : undefined
  const strictExtrasMessage = addlPropsMessage ?? unevalPropsMessage

  const propertyNamesFilter = (): string => {
    if (schema.propertyNames?.pattern) {
      return `Schema.makeFilter((input)=>Object.keys(input).every((key)=>new RegExp(${JSON.stringify(schema.propertyNames.pattern)}).test(key))${propNamesErrorArg})`
    }
    if (schema.propertyNames?.enum) {
      return `Schema.makeFilter((input)=>Object.keys(input).every((key)=>${JSON.stringify(schema.propertyNames.enum)}.includes(key))${propNamesErrorArg})`
    }
    return ''
  }

  const patternPropertiesFilters = (): readonly string[] =>
    schema.patternProperties
      ? Object.entries(schema.patternProperties).map(([pattern, propSchema]) => {
          const s = effect(propSchema, rootName, isEffect, options)
          return `Schema.makeFilter((input)=>Object.entries(input).every(([key,value])=>!new RegExp(${JSON.stringify(pattern)}).test(key)||Schema.is(Schema.toEncoded(${s}))(value))${patternErrorArg})`
        })
      : []

  // ── additionalProperties: schema → Schema.Record(...) + propertyNames ──
  // With `properties` or patterns beside it, `additionalProperties` covers only the keys
  // they leave, handled with them below.
  if (
    typeof schema.additionalProperties === 'object' &&
    schema.properties === undefined &&
    schema.patternProperties === undefined
  ) {
    const record = `Schema.Record(Schema.String,${effect(schema.additionalProperties, rootName, isEffect, options)})`
    const checks = [propertyNamesFilter()].filter((a) => a !== '')
    return checks.length > 0 ? `${record}.check(${checks.join(',')})` : record
  }

  const properties = schema.properties ?? {}
  // A required key no property declares only has to be present.
  const undeclaredRequired = (schema.required ?? []).filter(
    (key) => !Object.hasOwn(properties, key),
  )
  const unevaluated = schema.unevaluatedProperties
  const closed = schema.additionalProperties === false || unevaluated === false
  // The schema a key no property names and no pattern matches is held to.
  const extraSchema =
    typeof schema.additionalProperties === 'object'
      ? schema.additionalProperties
      : typeof unevaluated === 'object'
        ? unevaluated
        : undefined
  const extraMessage =
    typeof schema.additionalProperties === 'object'
      ? schema['x-additionalProperties-message']
      : schema['x-unevaluatedProperties-message']
  const checksKeys = undeclaredRequired.length > 0 || extraSchema !== undefined || closed
  if (!schema.properties && !checksKeys) {
    // v3.2: patternProperties without properties → unknown-typed Record + filter.
    if (schema.patternProperties) {
      const record = 'Schema.Record(Schema.String,Schema.Unknown)'
      const checks = [propertyNamesFilter(), ...patternPropertiesFilters()].filter((a) => a !== '')
      return checks.length > 0 ? `${record}.check(${checks.join(',')})` : record
    }
    if (schema.additionalProperties === true) return 'Schema.Unknown'
    return 'Schema.Struct({})'
  }

  const required = new Set(schema.required)
  const props = Object.entries(properties)
    .map(([key, propSchema]) => {
      const parsed = effect(
        propSchema,
        rootName,
        isEffect,
        propertyEmitOptions(key, propSchema, options) ?? options,
      )
      if (!parsed) return null
      const safeKey = makeSafeKey(key)
      const isRequired = required.has(key)
      // `Schema.withDecodingDefault` already makes the encoded key optional, so
      // a defaulted property must not be wrapped again.
      const hasDecodingDefault = parsed.includes('Schema.withDecodingDefault')
      // An optional property may be left out, not set to `undefined`: JSON has no
      // `undefined`, so `Schema.optionalKey` (`a?: T`, as Zod's `.exactOptional()`) and not
      // `Schema.optional` (`a?: T | undefined`).
      return isRequired || hasDecodingDefault
        ? `${safeKey}:${parsed}`
        : `${safeKey}:Schema.optionalKey(${parsed})`
    })
    .filter((p) => p !== null)

  // A struct drops the keys it does not declare before a filter sees the value, so a
  // keyword that reads those keys (`if`/`then`/`else` sub-schemas may name them too) needs
  // the object to keep them. v4 spells an index signature as
  // `Schema.StructWithRest(struct, [record])`.
  const readsUndeclaredKeys =
    hasConditional(schema) ||
    schema.patternProperties !== undefined ||
    schema.propertyNames !== undefined ||
    schema.minProperties !== undefined ||
    schema.maxProperties !== undefined ||
    schema.dependentRequired !== undefined ||
    checksKeys
  const struct = `Schema.Struct({${props.join(',')}})`
  const rawBase = readsUndeclaredKeys
    ? `Schema.StructWithRest(${struct},[Schema.Record(Schema.String,Schema.Unknown)])`
    : struct
  const propsMessage = schema['x-properties-message']
  const partialBase = propsMessage ? wholeValueMessage(rawBase, propsMessage) : rawBase

  const minPropertiesFilter =
    typeof schema.minProperties === 'number'
      ? `Schema.makeFilter((input)=>Object.keys(input).length>=${schema.minProperties}${minErrorArg})`
      : ''
  const maxPropertiesFilter =
    typeof schema.maxProperties === 'number'
      ? `Schema.makeFilter((input)=>Object.keys(input).length<=${schema.maxProperties}${maxErrorArg})`
      : ''
  const dependentRequiredFilters: readonly string[] = schema.dependentRequired
    ? Object.entries(schema.dependentRequired).map(([key, deps]) => {
        const depsCheck = deps.map((d) => `'${d}' in input`).join('&&')
        return `Schema.makeFilter((input)=>!('${key}' in input)||(${depsCheck})${depReqErrorArg})`
      })
    : []
  // v3.0: dependentSchemas — when key present, the whole object must
  // additionally satisfy the named sub-schema.
  const dependentSchemasFilters: readonly string[] = schema.dependentSchemas
    ? Object.entries(schema.dependentSchemas).map(([key, subSchema]) => {
        const s = effect(subSchema, rootName, isEffect, options)
        return `Schema.makeFilter((input)=>!('${key}' in input)||Schema.is(${s})(input)${depSchErrorArg})`
      })
    : []
  const requiredPresentFilter =
    undeclaredRequired.length > 0
      ? `Schema.makeFilter((input)=>${JSON.stringify(undeclaredRequired)}.every((key)=>key in input)${errorArg})`
      : ''
  // A key no property names and no pattern matches: refused when the object is closed,
  // held to `unevaluatedProperties` when that is a schema. v4 takes `onExcessProperty`
  // only as a decoding option, not from the schema, so the struct cannot refuse it itself.
  const isEvaluated = isEvaluatedKeyExpression(
    { names: Object.keys(properties), patterns: Object.keys(schema.patternProperties ?? {}) },
    'key',
  )
  const unevaluatedKeysFilter = closed
    ? `Schema.makeFilter((input)=>Object.keys(input).every((key)=>${isEvaluated})${effectErrorPart(strictExtrasMessage ?? errorMessage)})`
    : extraSchema !== undefined
      ? `Schema.makeFilter((input)=>Object.entries(input).every(([key,value])=>${isEvaluated}||Schema.is(Schema.toEncoded(${effect(extraSchema, rootName, isEffect, options)}))(value))${effectErrorPart(extraMessage ?? errorMessage)})`
      : ''

  // v3.2: if/then/else conditional schema. Routed through a filter: when `if`
  // matches, the object must also satisfy `then`; otherwise `else`.
  const ifThenElseFilters = (() => {
    if (!schema.if) return []
    const ifSchema = effect(schema.if, rootName, isEffect, options)
    const thenSchema = schema.then ? effect(schema.then, rootName, isEffect, options) : ''
    const elseSchema = schema.else ? effect(schema.else, rootName, isEffect, options) : ''
    if (!thenSchema && !elseSchema) return []
    const ifMessage = schema['x-if-message']
    const thenMessage = schema['x-then-message'] ?? ifMessage
    const elseMessage = schema['x-else-message'] ?? ifMessage
    const parts: string[] = []
    if (thenSchema) {
      const arg = thenMessage ? `,${effectError(thenMessage)}` : errorArg
      parts.push(
        `Schema.makeFilter((input)=>!Schema.is(${ifSchema})(input)||Schema.is(${thenSchema})(input)${arg})`,
      )
    }
    if (elseSchema) {
      const arg = elseMessage ? `,${effectError(elseMessage)}` : errorArg
      parts.push(
        `Schema.makeFilter((input)=>Schema.is(${ifSchema})(input)||Schema.is(${elseSchema})(input)${arg})`,
      )
    }
    return parts
  })()

  const checks = [
    minPropertiesFilter,
    maxPropertiesFilter,
    propertyNamesFilter(),
    ...patternPropertiesFilters(),
    requiredPresentFilter,
    unevaluatedKeysFilter,
    ...dependentRequiredFilters,
    ...dependentSchemasFilters,
    ...ifThenElseFilters,
  ].filter((a) => a !== '')

  const checked = checks.length > 0 ? `${partialBase}.check(${checks.join(',')})` : partialBase
  const objectExpr = checked
  const hasInheritedName = Object.keys(properties).some(isObjectPrototypeProperty)
  return isStringWireLocation(options?.paramIn) && hasInheritedName
    ? effectPreprocess([ownProperties('input')], objectExpr)
    : objectExpr
}
