import {
  hasCombinator,
  hasConditional,
  isObjectPrototypeProperty,
  isStringWireLocation,
} from '../../guard/index.js'
import { propertyEmitOptions } from '../../helper/parameter.js'
import { isEvaluatedKeyExpression } from '../../helper/unevaluated.js'
import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey, zodError, zodErrorPart } from '../../utils/index.js'
import { nestedIssueMessageWrap, zod } from './zod.js'

/**
 * A parameter object answers an `Object.prototype` name it was not sent with the inherited
 * member. Copied onto a null-prototype object, it holds only what the request carried.
 */
const OWN_PROPERTIES_PREPROCESS =
  '(val)=>(typeof val==="object"&&val!==null&&!Array.isArray(val)?Object.assign(Object.create(null),val):val)'

/**
 * Generate a Zod object schema for a JSON Schema object node.
 *
 * Dispatches `additionalProperties` to `z.looseObject` (true), `z.strictObject`
 * (false), `z.record` (Schema), or default `z.object`. Combinators
 * (oneOf/anyOf/allOf/not) delegate to the main `zod` entry. JSON Schema 2020-12
 * keywords (`minProperties`, `maxProperties`, `propertyNames`,
 * `patternProperties`, `dependentRequired`) are emitted as `.refine(...)`
 * chains.
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isZod: boolean,
  options?: EmitOptions,
) {
  if (hasCombinator(schema)) return zod(schema, rootName, isZod, options)

  const errorMessage = schema['x-error-message']
  const errorArg = zodErrorPart(errorMessage)
  // v3.0: 1 keyword = 1 message
  const minPropsMessage = schema['x-minProperties-message']
  const minErrorArg = zodErrorPart(minPropsMessage)
  const maxPropsMessage = schema['x-maxProperties-message']
  const maxErrorArg = zodErrorPart(maxPropsMessage)
  const patternPropsMessage = schema['x-patternProperties-message']
  const patternErrorArg = zodErrorPart(patternPropsMessage)
  const propNamesMessage = schema['x-propertyNames-message']
  const propNamesErrorArg = zodErrorPart(propNamesMessage)
  const depReqMessage = schema['x-dependentRequired-message']
  const depReqErrorArg = depReqMessage ? `,${zodError(depReqMessage)}` : errorArg
  const depSchMessage = schema['x-dependentSchemas-message']
  const depSchErrorArg = depSchMessage ? `,${zodError(depSchMessage)}` : errorArg
  // JSON Schema 2020-12 §11.4: outside compositions, `unevaluatedProperties`
  // reduces to `additionalProperties`. The message rides through the
  // strictObject `unrecognized_keys` error param (see `strictMessage` below).

  // ── additionalProperties: schema → z.record(...) + propertyNames ──
  // NOTE: `.readonly()` is appended by the dispatcher (`zod.ts:readonly`),
  // so this function does NOT add `.readonly()` itself.
  // With `properties` or patterns beside it, `additionalProperties` covers only the keys
  // they leave, handled with them below.
  if (
    typeof schema.additionalProperties === 'object' &&
    schema.properties === undefined &&
    schema.patternProperties === undefined
  ) {
    const record = `z.record(z.string(),${zod(schema.additionalProperties, rootName, isZod, options)})`
    const recordPropNames = schema.propertyNames?.pattern
      ? `.refine((val)=>Object.keys(val).every((key)=>new RegExp(${JSON.stringify(schema.propertyNames.pattern)}).test(key))${propNamesErrorArg})`
      : schema.propertyNames?.enum
        ? `.refine((val)=>Object.keys(val).every((key)=>${JSON.stringify(schema.propertyNames.enum)}.includes(key))${propNamesErrorArg})`
        : ''
    return `${record}${recordPropNames}`
  }

  const properties = schema.properties ?? {}
  // A required key no property declares only has to be present.
  const undeclaredRequired = (schema.required ?? []).filter(
    (key) => !Object.hasOwn(properties, key),
  )
  const unevaluated = schema.unevaluatedProperties
  const closed = schema.additionalProperties === false || unevaluated === false
  // A key outside `properties` is still allowed when a pattern or a schema covers it, so the
  // object cannot simply reject undeclared keys.
  const closedByCheck = closed && schema.patternProperties !== undefined
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
  if (!schema.properties) {
    if (schema.additionalProperties === true) return 'z.any()'
    const checksKeys =
      undeclaredRequired.length > 0 ||
      schema.patternProperties !== undefined ||
      extraSchema !== undefined ||
      closed
    if (!checksKeys) return 'z.object({})'
  }

  // `z.object()` strips the keys it does not declare before a refine sees the value, so a
  // keyword that reads those keys needs the object to keep them.
  const readsUndeclaredKeys =
    hasConditional(schema) ||
    schema.patternProperties !== undefined ||
    schema.propertyNames !== undefined ||
    schema.minProperties !== undefined ||
    schema.maxProperties !== undefined ||
    schema.dependentRequired !== undefined ||
    schema.dependentSchemas !== undefined ||
    undeclaredRequired.length > 0 ||
    extraSchema !== undefined ||
    closedByCheck
  const objectType =
    schema.additionalProperties === true
      ? 'looseObject'
      : closed && !closedByCheck
        ? 'strictObject'
        : readsUndeclaredKeys
          ? 'looseObject'
          : 'object'
  const required = new Set(schema.required)
  const props = Object.entries(properties)
    .map(([key, propSchema]) => {
      const parsed = zod(
        propSchema,
        rootName,
        isZod,
        propertyEmitOptions(key, propSchema, options) ?? options,
      )
      if (!parsed) return null
      const safeKey = makeSafeKey(key)
      return `${safeKey}:${parsed}${required.has(key) ? '' : '.exactOptional()'}`
    })
    .filter((v) => v !== null)
  // x-additionalProperties-message / x-unevaluatedProperties-message both
  // attach to the `unrecognized_keys` issue (only meaningful for strictObject).
  // Specific keyword takes precedence: additionalProperties > unevaluatedProperties.
  const addlPropsMessage = schema['x-additionalProperties-message']
  const strictMessage =
    addlPropsMessage ??
    (schema.unevaluatedProperties === false ? schema['x-unevaluatedProperties-message'] : undefined)
  const objectParams =
    objectType === 'strictObject' && strictMessage
      ? `,{error:(issue)=>issue.code==='unrecognized_keys'?${JSON.stringify(strictMessage)}:${errorMessage ? JSON.stringify(errorMessage) : 'undefined'}}`
      : ''

  const rawBase = `z.${objectType}({${props.join(',')}}${objectParams})`
  const propsMessage = schema['x-properties-message']
  const partialBase = propsMessage ? nestedIssueMessageWrap(rawBase, propsMessage) : rawBase

  const minProperties =
    typeof schema.minProperties === 'number'
      ? `.refine((val)=>Object.keys(val).length>=${schema.minProperties}${minErrorArg})`
      : ''
  const maxProperties =
    typeof schema.maxProperties === 'number'
      ? `.refine((val)=>Object.keys(val).length<=${schema.maxProperties}${maxErrorArg})`
      : ''
  const propertyNames = schema.propertyNames?.pattern
    ? `.refine((val)=>Object.keys(val).every((key)=>new RegExp(${JSON.stringify(schema.propertyNames.pattern)}).test(key))${propNamesErrorArg})`
    : schema.propertyNames?.enum
      ? `.refine((val)=>Object.keys(val).every((key)=>${JSON.stringify(schema.propertyNames.enum)}.includes(key))${propNamesErrorArg})`
      : ''
  const patternProperties = schema.patternProperties
    ? Object.entries(schema.patternProperties)
        .map(([pattern, propSchema]) => {
          const z = zod(propSchema, rootName, isZod, options)
          return `.refine((val)=>Object.entries(val).every(([key,value])=>!new RegExp(${JSON.stringify(pattern)}).test(key)||${z}.safeParse(value).success)${patternErrorArg})`
        })
        .join('')
    : ''
  const dependentRequired = schema.dependentRequired
    ? Object.entries(schema.dependentRequired)
        .map(([key, deps]) => {
          const depsCheck = deps.map((d) => `'${d}' in val`).join('&&')
          return `.refine((val)=>!('${key}' in val)||(${depsCheck})${depReqErrorArg})`
        })
        .join('')
    : ''
  // v3.0: dependentSchemas — sub-schema validation when dependency key present.
  // Uses its own x-dependentSchemas-message (distinct from x-dependentRequired-message).
  const dependentSchemas = schema.dependentSchemas
    ? Object.entries(schema.dependentSchemas)
        .map(([key, subSchema]) => {
          const subZod = zod(subSchema, rootName, isZod, options)
          return `.refine((val)=>!('${key}' in val)||${subZod}.safeParse(val).success${depSchErrorArg})`
        })
        .join('')
    : ''

  const ifThenElse = (() => {
    if (!schema.if) return ''
    const ifS = zod(schema.if, rootName, isZod, options)
    const thenS = schema.then ? zod(schema.then, rootName, isZod, options) : undefined
    const elseS = schema.else ? zod(schema.else, rootName, isZod, options) : undefined
    if (!thenS && !elseS) return ''
    const ifMessage = schema['x-if-message']
    const thenMessage = schema['x-then-message'] ?? ifMessage
    const elseMessage = schema['x-else-message'] ?? ifMessage
    const parts: string[] = []
    if (thenS) {
      const arg = zodErrorPart(thenMessage)
      parts.push(
        `.refine((val)=>!${ifS}.safeParse(val).success||${thenS}.safeParse(val).success${arg})`,
      )
    }
    if (elseS) {
      const arg = zodErrorPart(elseMessage)
      parts.push(
        `.refine((val)=>${ifS}.safeParse(val).success||${elseS}.safeParse(val).success${arg})`,
      )
    }
    return parts.join('')
  })()

  const requiredPresent =
    undeclaredRequired.length > 0
      ? `.refine((val)=>${JSON.stringify(undeclaredRequired)}.every((key)=>key in val)${errorArg})`
      : ''
  // A key no property names and no pattern matches: refused when the object is closed,
  // held to `unevaluatedProperties` when that is a schema.
  const isEvaluated = isEvaluatedKeyExpression(
    { names: Object.keys(properties), patterns: Object.keys(schema.patternProperties ?? {}) },
    'key',
  )
  const unevaluatedKeys = closedByCheck
    ? `.refine((val)=>Object.keys(val).every((key)=>${isEvaluated})${zodErrorPart(strictMessage ?? errorMessage)})`
    : extraSchema !== undefined
      ? `.refine((val)=>Object.entries(val).every(([key,value])=>${isEvaluated}||${zod(extraSchema, rootName, isZod, options)}.safeParse(value).success)${zodErrorPart(extraMessage ?? errorMessage)})`
      : ''
  const objectExpr = `${partialBase}${minProperties}${maxProperties}${propertyNames}${patternProperties}${requiredPresent}${unevaluatedKeys}${dependentRequired}${dependentSchemas}${ifThenElse}`
  const hasInheritedName = Object.keys(properties).some(isObjectPrototypeProperty)
  return isStringWireLocation(options?.paramIn) && hasInheritedName
    ? `z.preprocess(${OWN_PROPERTIES_PREPROCESS},${objectExpr})`
    : objectExpr
}
