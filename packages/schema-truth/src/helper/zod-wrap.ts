import { isNullable } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { coerceDefault } from '../utils/index.js'
import { readCodeExtension } from './code-extensions.js'
import type { CodeExtensionOptions } from './code-extensions.js'
import { serializeJSValue } from './meta.js'
import { examplesOf } from './schema.js'
import type { SchemaDefinitions } from './schema.js'

/** The options of {@link zodWrap}. */
export type ZodWrapOptions = CodeExtensionOptions & {
  /** Definitions a `default` beside a `$ref` is reconciled against. */
  readonly definitions?: SchemaDefinitions
}

/**
 * Wraps a Zod schema string with `.default()`, `.nullable()`, `.brand<...>()`
 * and a single Zod v4 metadata chain (`.meta({ ... })`) based on the JSON
 * Schema's `default` / `nullable` / `x-brand` and OpenAPI metadata fields.
 *
 * When `options.unsafeCodeExtensions` is true, chain-term extensions
 * (`x-refine` / `x-transform` / `x-pipe`) are appended between brand and
 * meta, and the outermost extensions (`x-codec` / `x-preprocess`) replace
 * the final result with their raw expression value.
 *
 * @see https://zod.dev/metadata
 */
export function zodWrap(zodStr: string, schema: JSONSchema, options?: ZodWrapOptions): string {
  const formatLiteral = (value: unknown): string => {
    if (typeof value === 'boolean') return `${value}`
    if (typeof value === 'number') {
      if (schema.format === 'int64' || schema.format === 'uint64') return `${value}n`
      if (schema.format === 'bigint') return `BigInt(${value})`
      return `${value}`
    }
    if (schema.type === 'date' && typeof value === 'string') {
      return `new Date(${JSON.stringify(value)})`
    }
    return JSON.stringify(value)
  }
  const defaultResult =
    schema.default !== undefined
      ? coerceDefault(schema, schema.default, options?.definitions)
      : undefined
  // `.nullable()` must precede `.default()` so a `default: null` is valid against
  // the nullable type; for non-null defaults the order is behaviourally identical.
  const withNullable = isNullable(schema) ? `${zodStr}.nullable()` : zodStr
  const withDefault = defaultResult?.keep
    ? `${withNullable}.default(${formatLiteral(defaultResult.value)})`
    : withNullable
  const withReadonly = schema['x-readonly'] === true ? `${withDefault}.readonly()` : withDefault
  const withPrefault =
    schema['x-prefault'] !== undefined
      ? `${withReadonly}.prefault(${formatLiteral(schema['x-prefault'])})`
      : withReadonly
  const withCatch =
    schema['x-catch'] !== undefined
      ? `${withPrefault}.catch(${formatLiteral(schema['x-catch'])})`
      : withPrefault
  const brand = schema['x-brand']
  const withBrand = typeof brand === 'string' ? `${withCatch}.brand<"${brand}">()` : withCatch

  const refine = readCodeExtension(schema, 'x-refine', options)
  const transform = readCodeExtension(schema, 'x-transform', options)
  const pipe = readCodeExtension(schema, 'x-pipe', options)
  const withRefine = refine ? `${withBrand}${refine}` : withBrand
  const withTransform = transform ? `${withRefine}${transform}` : withRefine
  const withPipe = pipe ? `${withTransform}${pipe}` : withTransform

  const examples = examplesOf(schema)
  const metaObj: Record<string, unknown> = {}
  if (schema.description !== undefined) metaObj.description = schema.description
  if (examples !== undefined) metaObj.examples = examples
  if (schema.deprecated !== undefined) metaObj.deprecated = schema.deprecated
  if (schema.externalDocs !== undefined) metaObj.externalDocs = schema.externalDocs
  if (schema.readOnly !== undefined) metaObj.readOnly = schema.readOnly
  if (schema.writeOnly !== undefined) metaObj.writeOnly = schema.writeOnly
  const withMeta =
    Object.keys(metaObj).length === 0 ? withPipe : `${withPipe}.meta(${serializeJSValue(metaObj)})`

  const codec = readCodeExtension(schema, 'x-codec', options)
  const preprocess = readCodeExtension(schema, 'x-preprocess', options)
  if (codec) return codec
  if (preprocess) return preprocess
  return withMeta
}
