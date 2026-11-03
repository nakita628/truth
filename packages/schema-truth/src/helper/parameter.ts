import { hasType } from '../guard/index.js'
import type { EmitOptions } from '../options/index.js'
import type { JSONSchema, ParamIn, ParamStyle } from '../parser/index.js'

/**
 * How an OpenAPI Parameter Object's text is read into the value its schema describes:
 * `allowEmptyValue`, a JSON `content`, or its `style` / `explode`. Every reader is the
 * source of a `(param) => ...` arrow, which each generator wraps in its own
 * preprocessing form.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#style-examples
 */

/** A media type that holds a JSON document: `application/json` or any `+json` suffix. */
const JSON_MEDIA_TYPE_PATTERN = /^[^/]+\/(?:[^;]+\+)?json\s*(?:;|$)/iu

/** The leading `.` of a `label` value, as a regex literal. */
const LABEL_PREFIX = String.raw`/^\./u`

/** The leading `;name=` of a non-exploded `matrix` value, as a regex literal. */
const MATRIX_PREFIX = '/^;[^=]*=?/u'

/** Whether the options carry any of a parameter's serialization fields. */
export function hasParameterSerialization(options: EmitOptions | undefined): boolean {
  return (
    options?.style !== undefined ||
    options?.explode !== undefined ||
    options?.allowEmptyValue === true ||
    options?.contentType !== undefined
  )
}

/**
 * The options the nodes under a parameter's root are emitted with: no serialization, and
 * no string wire either when the parameter's text is a JSON document.
 */
export function withoutParameterSerialization(options: EmitOptions | undefined): EmitOptions {
  const isJson = isJsonMediaType(options?.contentType)
  return {
    ...(options?.openapi !== undefined && { openapi: options.openapi }),
    ...(options?.readonly !== undefined && { readonly: options.readonly }),
    ...(options?.unsafeCodeExtensions !== undefined && {
      unsafeCodeExtensions: options.unsafeCodeExtensions,
    }),
    ...(options?.paramIn !== undefined && !isJson && { paramIn: options.paramIn }),
    ...(options?.definitions !== undefined && { definitions: options.definitions }),
    ...(options?.properties !== undefined && { properties: options.properties }),
  }
}

/**
 * The emit options of one property, when that property carries its own serialization
 * (`x-style` / `x-explode` / `x-allowEmptyValue`, or `options.properties`). `undefined`
 * when it does not, so the caller keeps the object's options. Requires `paramIn`: the
 * keywords describe wire text.
 */
export function propertyEmitOptions(
  key: string,
  property: JSONSchema,
  options: EmitOptions | undefined,
): EmitOptions | undefined {
  if (options?.paramIn === undefined) return undefined
  const named = options.properties?.[key]
  const style = named?.style ?? property['x-style']
  const explode = named?.explode ?? property['x-explode']
  const allowEmptyValue = named?.allowEmptyValue === true || property['x-allowEmptyValue'] === true
  if (style === undefined && explode === undefined && !allowEmptyValue) return undefined
  return {
    ...(options.openapi !== undefined && { openapi: options.openapi }),
    ...(options.readonly !== undefined && { readonly: options.readonly }),
    ...(options.unsafeCodeExtensions !== undefined && {
      unsafeCodeExtensions: options.unsafeCodeExtensions,
    }),
    ...(options.definitions !== undefined && { definitions: options.definitions }),
    paramIn: options.paramIn,
    ...(style !== undefined && { style }),
    ...(explode !== undefined && { explode }),
    ...(allowEmptyValue && { allowEmptyValue: true }),
  }
}

function isJsonMediaType(contentType: string | undefined): boolean {
  return contentType !== undefined && JSON_MEDIA_TYPE_PATTERN.test(contentType)
}

/** The `style` a parameter has when its Parameter Object names none. */
function defaultStyle(paramIn: ParamIn | undefined): ParamStyle | undefined {
  if (paramIn === 'path' || paramIn === 'header') return 'simple'
  if (paramIn === undefined) return undefined
  return 'form'
}

/** `text`, a string expression, split on `separator` — none for an empty text. */
function split(text: string, separator: string): string {
  return `(${text}===''?[]:${text}.split(${JSON.stringify(separator)}))`
}

/** An array of `[name, value, name, value, ...]` read into an object. */
function pairs(parts: string): string {
  return `${parts}.reduce<{[k:string]:string}>((acc,part,i,all)=>i%2===1?{...acc,[all[i-1]??'']:part}:acc,{})`
}

/** An array of `name=value` read into an object. */
function entries(parts: string): string {
  return `${parts}.reduce<{[k:string]:string}>((acc,part)=>{const i=part.indexOf('=');return i<0?{...acc,[part]:''}:{...acc,[part.slice(0,i)]:part.slice(i+1)}},{})`
}

/** An empty value stands for an absent parameter, so its default applies. */
function emptyValueReader(param: string): string {
  return `(${param})=>(${param}===''?undefined:${param})`
}

/** The text of a `content: application/json` parameter, read as the JSON document it holds. */
function jsonReader(param: string): string {
  return `(${param})=>{if(typeof ${param}!=='string')return ${param};try{return JSON.parse(${param})}catch{return ${param}}}`
}

/** `deep[age]=5&deep[name]=bob`, gathered into the one object `{ age, name }`. */
function deepObjectReader(param: string): string {
  return String.raw`(${param})=>{if(typeof ${param}!=='object'||${param}===null||Array.isArray(${param}))return ${param};const out=Object.entries(${param}).reduce<{[k:string]:unknown}>((acc,[key,value])=>{const name=/^[^[\]]+\[([^\]]+)\]$/u.exec(key)?.[1];return name===undefined?acc:{...acc,[name]:value}},{});return Object.keys(out).length>0?out:${param}}`
}

/** A reader of a string value: `body` maps `text`, the value with `prefix` removed. */
function textReader(param: string, body: string, prefix?: string): string {
  const text = prefix === undefined ? param : `${param}.replace(${prefix},'')`
  return `(${param})=>{if(typeof ${param}!=='string')return ${param};const text=${text};return ${body}}`
}

function arrayReader(param: string, style: ParamStyle, explode: boolean): string | undefined {
  if (style === 'simple') return textReader(param, split('text', ','))
  if (style === 'label') return textReader(param, split('text', explode ? '.' : ','), LABEL_PREFIX)
  if (style === 'matrix') {
    return explode
      ? textReader(
          param,
          `text.split(';').filter((part)=>part!=='').map((part)=>part.slice(part.indexOf('=')+1))`,
        )
      : textReader(param, split('text', ','), MATRIX_PREFIX)
  }
  // An exploded `form` (and its delimited siblings) repeats the name instead.
  if (explode || style === 'deepObject') return undefined
  const separator = style === 'spaceDelimited' ? ' ' : style === 'pipeDelimited' ? '|' : ','
  return textReader(param, split('text', separator))
}

function objectReader(param: string, style: ParamStyle, explode: boolean): string | undefined {
  if (style === 'deepObject') return deepObjectReader(param)
  if (style === 'simple') return textReader(param, (explode ? entries : pairs)(split('text', ',')))
  if (style === 'label') {
    return textReader(
      param,
      explode ? entries(split('text', '.')) : pairs(split('text', ',')),
      LABEL_PREFIX,
    )
  }
  if (style === 'matrix') {
    return explode
      ? textReader(param, entries(`text.split(';').filter((part)=>part!=='')`))
      : textReader(param, pairs(split('text', ',')), MATRIX_PREFIX)
  }
  // An exploded `form` object spreads its properties over the query instead.
  if (explode) return undefined
  const separator = style === 'spaceDelimited' ? ' ' : style === 'pipeDelimited' ? '|' : ','
  return textReader(param, pairs(split('text', separator)))
}

function primitiveReader(param: string, style: ParamStyle): string | undefined {
  if (style === 'label') return textReader(param, 'text', LABEL_PREFIX)
  if (style === 'matrix') return textReader(param, 'text', MATRIX_PREFIX)
  return undefined
}

/** What reads a parameter's text in `style` into the value its schema describes. */
function styleReader(
  param: string,
  schema: JSONSchema,
  style: ParamStyle,
  explode: boolean,
): string | undefined {
  if (hasType(schema, 'array') || schema.items !== undefined || schema.prefixItems !== undefined) {
    return arrayReader(param, style, explode)
  }
  if (hasType(schema, 'object') || schema.properties !== undefined) {
    return objectReader(param, style, explode)
  }
  return primitiveReader(param, style)
}

/**
 * The readers of a parameter's serialization, outermost first: the `allowEmptyValue`
 * reader, then the one for a JSON `content` or the parameter's `style` / `explode`. Each
 * is the source of an arrow over `param`, the name the target library gives a predicate's
 * input.
 */
export function parameterReaders(
  schema: JSONSchema,
  options: EmitOptions | undefined,
  param: string,
): readonly string[] {
  const style = options?.style ?? defaultStyle(options?.paramIn)
  const reader = isJsonMediaType(options?.contentType)
    ? jsonReader(param)
    : style === undefined
      ? undefined
      : styleReader(param, schema, style, options?.explode ?? style === 'form')
  return [options?.allowEmptyValue === true ? emptyValueReader(param) : undefined, reader].filter(
    (step) => step !== undefined,
  )
}
