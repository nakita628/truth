import { schemaToArktype } from 'schema-truth/arktype'
import { schemaToEffect } from 'schema-truth/effect'
import { schemaToTypebox } from 'schema-truth/typebox'
import { schemaToValibot } from 'schema-truth/valibot'
import { schemaToZod } from 'schema-truth/zod'

import type { Schema } from '../openapi/index.js'

/**
 * Where a value arrives as text: an OpenAPI parameter location, or `formData` for a field of
 * a form body. schema-truth coerces the value from text for every one of them.
 */
export type ParamIn = 'query' | 'path' | 'header' | 'cookie' | 'formData'

/**
 * A Parameter Object's `style`: how its text is split into an array or an object.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#style-values
 */
export type ParamStyle =
  | 'matrix'
  | 'label'
  | 'simple'
  | 'form'
  | 'spaceDelimited'
  | 'pipeDelimited'
  | 'deepObject'

const PARAM_STYLES: readonly string[] = [
  'matrix',
  'label',
  'simple',
  'form',
  'spaceDelimited',
  'pipeDelimited',
  'deepObject',
] satisfies readonly ParamStyle[]

/** Narrow a Parameter Object's free-form `style` to one schema-truth reads. */
export function isParamStyle(style: string): style is ParamStyle {
  return PARAM_STYLES.includes(style)
}

export type SchemaLib = 'zod' | 'valibot' | 'arktype' | 'effect' | 'typebox'

/**
 * Which `schema:` slot a host `wrapSchema` hook is looking at. The second
 * argument is optional so an existing one-argument hook keeps compiling.
 */
export type SchemaSlot =
  | 'response-content'
  | 'request-content'
  | 'header'
  | 'parameter'
  | 'media-type'

/**
 * Optional third argument to `toExpression`. TypeBox puts `ref` in builder options. `style`,
 * `explode` and `allowEmptyValue` are the parameter's own and apply with a `paramIn`; Zod,
 * Valibot, Effect and Arktype read them, TypeBox ignores them.
 */
export type ToExpressionOptions = {
  readonly ref?: string
  readonly style?: ParamStyle
  readonly explode?: boolean
  readonly allowEmptyValue?: boolean
}

/**
 * Flags `renderImport` uses when the schemas builder needs more than the
 * library's default line — Arktype `scope` for a `$ref` cycle, TypeBox
 * `Static` when type aliases are exported.
 */
export type RenderImportOptions = {
  readonly cyclic?: boolean
  readonly exportTypes?: boolean
  /**
   * The code the import line serves. Effect spreads its schema API over several modules
   * (`Effect.succeed` for a decoding default, `SchemaTransformation` for an int64 decode),
   * so its adapter imports each module this code names; the other libraries ignore it.
   */
  readonly code?: string
}

/**
 * An expression and the comment lines schema-truth wrote above its declaration, such as
 * TypeBox's marker for a `not` it cannot enforce. A declaration builder writes them above
 * `export const`; an inline `schema:` slot has nowhere to put them.
 */
export type ExpressionParts = {
  readonly expression: string
  readonly comments: readonly string[]
}

/**
 * How this library's inferred object type differs from a Zod-shaped
 * `prop?: T` literal, so the TS7022 helper matches `cyclicAnnotation` under
 * `exactOptionalPropertyTypes`. Omitted properties keep the Zod form.
 */
export type CyclicTypeStyle = {
  readonly optionalUndefined?: boolean
  readonly readonlyArrays?: boolean
}

/**
 * The minimal surface the component generators consume from a validator
 * adapter. Each library's full adapter (carrying `toNamedExport`,
 * `annotateCyclic`, `objectField`, … for schema/contract generation) is a
 * structural supertype, so it can be passed wherever a `ComponentAdapter` is
 * required without a cast.
 *
 * `wrapSchema` is an optional host hook applied to every `schema:` slot
 * expression (inline and `$ref` alike). The second argument is the slot so a
 * host can wrap response content and leave header schemas plain. Omitting the
 * hook leaves the expression untouched (identity), so the shared library stays
 * framework-agnostic.
 *
 * `withRef` is the library-specific outer wrap for a component name
 * (`.meta({ref})`, `v.metadata`, `.configure({ref})`, `.annotate({identifier})`).
 * TypeBox has no post-construction wrap: pass `ref` to `toExpression` instead.
 *
 * Cycle handling lives next to each library: `wrapLazy` re-wraps a `$ref`
 * inside a strongly connected component (Zod, Valibot, Effect);
 * `cyclicAnnotation` is the TS7022 annotation on that declaration;
 * `cyclicTypeStyle` is the helper type that annotation names;
 * `renderCyclic` post-processes the `$defs` container TypeBox and Arktype
 * need (`Type.Cyclic` is already the expression; Arktype extracts `scope`).
 */
export type ComponentAdapter = {
  readonly renderImport: (options?: RenderImportOptions) => string
  readonly toExpression: (
    schema: Schema,
    paramIn?: ParamIn,
    options?: ToExpressionOptions,
  ) => string
  /**
   * `toExpression` with the comment lines schema-truth emits above the declaration. Every
   * adapter `makeAdapter` returns has it; a host adapter without it gets no comments.
   */
  readonly toExpressionParts?: (
    schema: Schema,
    paramIn?: ParamIn,
    options?: ToExpressionOptions,
  ) => ExpressionParts
  readonly renderTypeInfer: (constName: string) => string
  readonly wrapSchema?: (expr: string, slot?: SchemaSlot) => string
  readonly withRef?: (expr: string, ref: string) => string
  readonly wrapLazy?: (varName: string) => string
  readonly cyclicAnnotation?: (typeName: string) => string
  readonly cyclicTypeStyle?: CyclicTypeStyle
  readonly renderCyclic?: (
    varName: string,
    containerExpr: string,
    externals: readonly string[],
  ) => string
  readonly reservedTypeNames?: readonly string[]
}

/** A generated identifier (`TagSchema`) is already a registered name — do not wrap it. */
function isBareIdent(expr: string) {
  return /^[A-Za-z_$][\w$]*$/u.test(expr)
}

/**
 * Widen the rich `Schema` type to a bare JSON-Schema object for schema-truth.
 * `Schema` is not structurally assignable to its `JSONSchema` (e.g. `x-emailPattern`
 * literal unions differ), so this `as`-free bridge erases the incompatible members.
 */
function toJsonSchema(schema: Schema): { readonly [k: string]: unknown } {
  return schema
}

/** The wire options schema-truth reads, without an `undefined` member. */
function wireOptions(paramIn: ParamIn | undefined, options: ToExpressionOptions | undefined) {
  return {
    ...(paramIn && { paramIn }),
    ...(options?.style !== undefined && { style: options.style }),
    ...(options?.explode !== undefined && { explode: options.explode }),
    ...(options?.allowEmptyValue !== undefined && { allowEmptyValue: options.allowEmptyValue }),
  }
}

/**
 * Pull the bare expression out of a `export const X = <expr>` wrapper, then strip
 * cross-schema refs. The `//` comment lines above the declaration are returned apart, so a
 * marker never lands between `=` and the expression.
 */
function extractParts(code: string, stripRefs: (expr: string) => string = (s) => s) {
  const lines = code.split('\n').filter((line) => !line.startsWith('import '))
  const firstCode = lines.findIndex((line) => line.trim() !== '' && !line.startsWith('//'))
  const head = firstCode === -1 ? lines : lines.slice(0, firstCode)
  const comments = head.filter((line) => line.startsWith('//'))
  const joined = (firstCode === -1 ? [] : lines.slice(firstCode)).join('\n').trim()
  const match = /^export const \w+ = (.+)$/su.exec(joined)
  const expr = match?.[1]
  const expression = stripRefs(expr === undefined ? joined : expr.replace(/;?\s*$/u, ''))
  return { expression, comments }
}

/** An adapter's `toExpression` and `toExpressionParts` over one schema-truth call. */
function expressionMethods(
  generate: (
    schema: Schema,
    paramIn: ParamIn | undefined,
    options: ToExpressionOptions | undefined,
  ) => string,
  stripRefs?: (expr: string) => string,
) {
  const toExpressionParts = (schema: Schema, paramIn?: ParamIn, options?: ToExpressionOptions) =>
    extractParts(generate(schema, paramIn, options), stripRefs)
  return {
    toExpressionParts,
    toExpression: (schema: Schema, paramIn?: ParamIn, options?: ToExpressionOptions) =>
      toExpressionParts(schema, paramIn, options).expression,
  }
}

/**
 * The `effect` modules `code` names, `Schema` always among them: the rule schema-truth's
 * Effect CLI writes its import line by.
 */
function effectModules(code: string) {
  return [
    ...(/(?<![\w.])Effect\./u.test(code) ? ['Effect'] : []),
    'Schema',
    ...(/(?<![\w.])SchemaGetter\./u.test(code) ? ['SchemaGetter'] : []),
    ...(/(?<![\w.])SchemaIssue\./u.test(code) ? ['SchemaIssue'] : []),
    ...(/(?<![\w.])SchemaTransformation\./u.test(code) ? ['SchemaTransformation'] : []),
  ]
}

/** One factory per library; the mapped type makes a missing library a compile error. */
const ADAPTERS: { readonly [K in SchemaLib]: () => ComponentAdapter } = {
  zod: makeZodAdapter,
  valibot: makeValibotAdapter,
  arktype: makeArktypeAdapter,
  typebox: makeTypeboxAdapter,
  effect: makeEffectAdapter,
}

export function makeAdapter(lib: SchemaLib) {
  return ADAPTERS[lib]()
}

/** Inline `z.lazy(() => XSchema)` back to the bare `XSchema` reference. */
function stripZodLazy(code: string) {
  return code.replaceAll(/z\.lazy\(\(\)\s*=>\s*(\w+Schema)\)/gu, '$1')
}

/** Inline `v.lazy(() => XSchema)` back to the bare `XSchema` reference. */
function stripValibotLazy(code: string) {
  return code.replaceAll(/v\.lazy\(\(\)\s*=>\s*(\w+Schema)\)/gu, '$1')
}

/** Inline `Schema.suspend(() => XSchema)` back to the bare `XSchema` reference. */
function stripEffectSuspend(code: string) {
  return code.replaceAll(/Schema\.suspend\(\(\)\s*=>\s*(\w+Schema)\)/gu, '$1')
}

/**
 * Arktype's `$defs` document becomes `const types = scope({...}).export()` plus
 * a selected member. The schemas builder needs the `scope` body so it can alias
 * references that leave the cycle.
 */
function renderArktypeCyclic(varName: string, containerExpr: string, externals: readonly string[]) {
  const body = /scope\(\{([\s\S]*)\}\)\.export\(\)/u.exec(containerExpr)?.[1]
  if (body === undefined) return containerExpr
  return `scope({${[...externals.map((ref) => `${ref}:${ref}`), body].join(',')}}).export().${varName}`
}

function makeZodAdapter(): ComponentAdapter {
  return {
    ...expressionMethods(
      (schema, paramIn, options) =>
        schemaToZod(toJsonSchema(schema), {
          exportType: false,
          openapi: true,
          readonly: false,
          ...wireOptions(paramIn, options),
        }),
      stripZodLazy,
    ),
    renderImport() {
      return "import * as z from 'zod'"
    },
    renderTypeInfer(constName) {
      return `export type ${constName}=z.infer<typeof ${constName}>`
    },
    wrapLazy(varName) {
      return `z.lazy(() => ${varName})`
    },
    cyclicAnnotation(typeName) {
      return `z.ZodType<${typeName}>`
    },
    withRef(expr, ref) {
      return isBareIdent(expr) ? expr : `${expr}.meta({ref:${JSON.stringify(ref)}})`
    },
  }
}

function makeValibotAdapter(): ComponentAdapter {
  return {
    ...expressionMethods(
      (schema, paramIn, options) =>
        schemaToValibot(toJsonSchema(schema), {
          exportType: false,
          openapi: true,
          readonly: false,
          ...wireOptions(paramIn, options),
        }),
      stripValibotLazy,
    ),
    renderImport() {
      return "import * as v from 'valibot'"
    },
    renderTypeInfer(constName) {
      return `export type ${constName}=v.InferOutput<typeof ${constName}>`
    },
    wrapLazy(varName) {
      return `v.lazy(() => ${varName})`
    },
    cyclicAnnotation(typeName) {
      return `v.GenericSchema<${typeName}>`
    },
    cyclicTypeStyle: { optionalUndefined: true },
    withRef(expr, ref) {
      return isBareIdent(expr) ? expr : `v.pipe(${expr},v.metadata({ref:${JSON.stringify(ref)}}))`
    },
  }
}

function makeArktypeAdapter(): ComponentAdapter {
  return {
    ...expressionMethods((schema, paramIn, options) =>
      schemaToArktype(toJsonSchema(schema), {
        exportType: false,
        openapi: true,
        readonly: false,
        ...wireOptions(paramIn, options),
      }),
    ),
    renderImport(options) {
      return options?.cyclic === true
        ? "import { type, scope } from 'arktype'"
        : "import { type } from 'arktype'"
    },
    renderTypeInfer(constName) {
      return `export type ${constName}=typeof ${constName}.infer`
    },
    renderCyclic: renderArktypeCyclic,
    reservedTypeNames: ['type', 'scope'],
    withRef(expr, ref) {
      return isBareIdent(expr) ? expr : `${expr}.configure({ref:${JSON.stringify(ref)}})`
    },
  }
}

function makeTypeboxAdapter(): ComponentAdapter {
  return {
    ...expressionMethods((schema, paramIn, options) =>
      schemaToTypebox(toJsonSchema(schema), {
        exportType: false,
        openapi: true,
        readonly: false,
        ...wireOptions(paramIn, options),
        ...(options?.ref !== undefined && { ref: options.ref }),
      }),
    ),
    renderImport(options) {
      return options?.exportTypes === true
        ? "import { Type, type Static } from 'typebox'"
        : "import { Type } from 'typebox'"
    },
    renderTypeInfer(constName) {
      return `export type ${constName}=Static<typeof ${constName}>`
    },
    reservedTypeNames: ['Type', 'Static', 'Codec', 'Compile'],
  }
}

function makeEffectAdapter(): ComponentAdapter {
  return {
    ...expressionMethods(
      (schema, paramIn, options) =>
        schemaToEffect(toJsonSchema(schema), {
          exportType: false,
          openapi: true,
          readonly: false,
          ...wireOptions(paramIn, options),
        }),
      stripEffectSuspend,
    ),
    renderImport(options) {
      return `import { ${effectModules(options?.code ?? '').join(', ')} } from 'effect'`
    },
    renderTypeInfer(constName) {
      return `export type ${constName}=Schema.Schema.Type<typeof ${constName}>`
    },
    wrapLazy(varName) {
      return `Schema.suspend(() => ${varName})`
    },
    // `Schema.Codec<T, unknown>` fixes the decoded type and leaves the encoded one free, so a
    // member that encodes differently, such as a property with a `default` (optional on the
    // encoded side), still fits; `Schema.Codec<T>` is `Codec<T, T>` and would not. Its services
    // stay `never`, which `Schema.toStandardSchemaV1` and `Schema.decodeUnknownSync` require;
    // `Schema.Schema<T>` leaves them `unknown`.
    cyclicAnnotation(typeName) {
      return `Schema.Codec<${typeName}, unknown>`
    },
    cyclicTypeStyle: { readonlyArrays: true },
    reservedTypeNames: ['Schema', 'Effect'],
    withRef(expr, ref) {
      return isBareIdent(expr) ? expr : `${expr}.annotate({identifier:${JSON.stringify(ref)}})`
    },
  }
}
