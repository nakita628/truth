import type { ComponentAdapter } from '../../adapter/index.js'
import { analyzeSchemas, collectSchemaRefs, makeCyclicType } from '../../helper/graph.js'
import { wrapReferences } from '../../helper/identifiers.js'
import type { Components, Schema } from '../../openapi/index.js'
import {
  claimName,
  declarationFileName,
  isRecord,
  makeSchemaIdentifiers,
  schemaRefToName,
  toIdentifierPascalCase,
} from '../../utils/index.js'

export type SchemasOptions = {
  readonly exportTypes?: boolean
  readonly readonly?: boolean
  /**
   * How to name the exported type alias. `const` (default) matches the other
   * builders (`UserSchema`); `key` uses the OpenAPI key (`User`).
   */
  readonly typeAlias?: 'const' | 'key'
  /**
   * Shape of the TS7022 helper type. `'library'` (default) matches what the
   * validator infers, so `v.GenericSchema<Helper>` / `Schema.Codec<Helper, unknown>`
   * type-check under `exactOptionalPropertyTypes`. `'literal'` is the
   * Zod-shaped `prop?: T` form for every library.
   */
  readonly cyclicTypeStyle?: 'library' | 'literal'
  /**
   * Host hook around each declaration expression — e.g. hono-openapi ref
   * registration. Applied after cycle handling. Wins over `ref`.
   */
  readonly wrapDeclaration?: (expr: string, name: string) => string
  /**
   * Register the OpenAPI key on each declaration. TypeBox puts it in the
   * outermost builder options via schema-truth; the other libraries use
   * `adapter.withRef` (an outer wrap). A bare identifier is left unchanged.
   */
  readonly ref?: boolean
}

export type SchemaDeclaration = {
  readonly name: string
  readonly varName: string
  readonly fileName: string
  /**
   * The library import this declaration needs when written to its own file.
   * An Arktype cycle that is only `scope({...}).export().Member` gets
   * `import { type, scope } from 'arktype'`; a non-cyclic file stays
   * `import { type } from 'arktype'`.
   */
  readonly importLine: string
  readonly code: string
}

/** Keys whose value is a subschema (or a list of them) and keys whose value maps names to subschemas. */
const SUBSCHEMA_KEYS: ReadonlySet<string> = new Set([
  'items',
  'prefixItems',
  'additionalProperties',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'if',
  'then',
  'else',
  'contains',
  'propertyNames',
  'unevaluatedItems',
  'unevaluatedProperties',
  'contentSchema',
])
const SUBSCHEMA_MAP_KEYS: ReadonlySet<string> = new Set([
  'properties',
  'patternProperties',
  'dependentSchemas',
  '$defs',
])

function isSchema(value: unknown): value is Schema {
  return isRecord(value)
}

/** Rewrites a schema bottom-up with `rewrite`, following only subschemas (never example or default values). */
function mapSchema(schema: Schema, rewrite: (node: Schema) => Schema) {
  const map = (value: unknown): unknown => (isSchema(value) ? mapSchema(value, rewrite) : value)
  const node = Object.fromEntries(
    Object.entries(schema).map(([key, value]) => {
      if (SUBSCHEMA_KEYS.has(key)) return [key, Array.isArray(value) ? value.map(map) : map(value)]
      if (SUBSCHEMA_MAP_KEYS.has(key) && isRecord(value)) {
        return [key, Object.fromEntries(Object.entries(value).map(([k, v]) => [k, map(v)]))]
      }
      return [key, value]
    }),
  )
  return rewrite(isSchema(node) ? node : schema)
}

/**
 * `readonly` as the declarative `x-readonly` extension on every object and array,
 * which schema-truth turns into each library's readonly form.
 */
function markReadonly(schema: Schema) {
  return mapSchema(schema, (node) => {
    const types = new Set<unknown>([node.type].flat())
    return types.has('object') || types.has('array') ? { ...node, 'x-readonly': true } : node
  })
}

/**
 * TypeBox and Arktype cannot express a cycle with standalone `const`s: the group
 * becomes one `Type.Cyclic(...)` / `scope(...)` container and each member selects
 * its entry. schema-truth builds the container from a `$defs` document.
 */
function rewriteCollisionRef(node: Schema, identifiers: ReadonlyMap<string, string>): Schema {
  if (typeof node.$ref !== 'string' || !node.$ref.startsWith('#/components/schemas/')) return node
  const key = schemaRefToName(node.$ref)
  const ident = identifiers.get(key)
  if (ident === undefined || ident === toIdentifierPascalCase(key)) return node
  return { ...node, $ref: `#/components/schemas/${ident}` }
}

/** The component key a `#/components/schemas/...` reference names; undefined for any other reference. */
function componentSchemaKey(ref: string) {
  return ref.startsWith('#/components/schemas/') ? schemaRefToName(ref) : undefined
}

/**
 * The component key a discriminator `mapping` target names: a `#/components/schemas/...`
 * reference, or a bare schema name, which the Discriminator Object also allows.
 */
function mappingTargetKey(target: string) {
  return target.includes('#') || target.includes('/') ? componentSchemaKey(target) : target
}

/** A keyword's value as a list, or none when the unsanitized document holds something else. */
function listOf(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

/** The string values a schema's own `propertyName` property is held to (`const` / `enum`). */
function ownDiscriminatorValues(schema: Schema, propertyName: string) {
  // The document is not sanitized yet, so a keyword may hold the wrong kind of value.
  const holders = [schema, ...listOf(schema.allOf)]
  for (const holder of holders) {
    if (!isSchema(holder)) continue
    const property = holder.properties?.[propertyName]
    if (!isSchema(property)) continue
    if (typeof property.const === 'string') return [property.const]
    const values = listOf(property.enum).filter(
      (value): value is string => typeof value === 'string',
    )
    if (values.length > 0) return values
  }
  return undefined
}

/**
 * The own values each unmapped member keeps: those no other member, mapping key or
 * fallback name also claims, as schema-truth's `discriminatedMembers` decides. A member
 * left with none keeps its schema name (`undefined` here), which is then claimed too,
 * unless that name is a mapping key whose target resolves to another schema (#74).
 */
function distinctOwnValues(
  mappingKeys: readonly string[],
  takenNames: ReadonlySet<string>,
  members: readonly { readonly name: string; readonly own: readonly string[] | undefined }[],
) {
  const counts = new Map<string, number>()
  for (const value of [...mappingKeys, ...members.flatMap(({ own }) => [...new Set(own)])]) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const settle = (chosen: readonly (readonly string[] | undefined)[]): typeof chosen => {
    const fallbacks = new Set(
      members.flatMap(({ name }, index) =>
        chosen[index] === undefined && !takenNames.has(name) ? [name] : [],
      ),
    )
    const next = chosen.map((values) => {
      const kept = values?.filter((value) => !fallbacks.has(value)) ?? []
      return kept.length > 0 ? kept : undefined
    })
    return next.every((values, index) => values?.length === chosen[index]?.length)
      ? next
      : settle(next)
  }
  return settle(
    members.map(({ own }) => {
      const kept = own?.filter((value) => counts.get(value) === 1) ?? []
      return kept.length > 0 ? kept : undefined
    }),
  )
}

/**
 * Pins, in a discriminator's mapping, the values a member's own discriminator property is
 * held to (`const` / `enum`) for a member the mapping names nowhere. The specification's
 * implicit value is the schema name, but a document such as OpenAI's `CompoundFilter`,
 * whose member declares `type: { enum: [eq, ne] }`, means those values, and the name
 * could never match (#73). schema-truth reads the same values from `$defs`; oas-truth
 * generates each component on its own, so it writes them into the mapping first.
 */
function pinOwnDiscriminatorValues(node: Schema, schemas: { readonly [k: string]: Schema }) {
  const { discriminator } = node
  if (!isSchema(discriminator) || typeof discriminator.propertyName !== 'string') return node
  const { propertyName } = discriminator
  const mapping = Object.entries(isRecord(discriminator.mapping) ? discriminator.mapping : {})
  const mapped = new Set(
    mapping.map(([, target]) =>
      typeof target === 'string' ? mappingTargetKey(target) : undefined,
    ),
  )
  const members = [...listOf(node.oneOf), ...listOf(node.anyOf)]
  const unmapped = members.flatMap((member) => {
    if (!isSchema(member) || typeof member.$ref !== 'string') return []
    const ref = member.$ref
    const key = componentSchemaKey(ref)
    if (key === undefined || mapped.has(key)) return []
    const target = Object.hasOwn(schemas, key) ? schemas[key] : undefined
    const own = target === undefined ? undefined : ownDiscriminatorValues(target, propertyName)
    return [{ ref, name: key, own }]
  })
  const chosen = distinctOwnValues(
    mapping.map(([value]) => value),
    new Set(
      mapping.flatMap(([value, target]) =>
        typeof target === 'string' && mappingTargetKey(target) !== undefined ? [value] : [],
      ),
    ),
    unmapped,
  )
  const pinned = unmapped.flatMap(({ ref }, index) =>
    (chosen[index] ?? []).map((value) => [value, ref] as const),
  )
  if (pinned.length === 0) return node
  return {
    ...node,
    discriminator: { ...discriminator, mapping: Object.fromEntries([...mapping, ...pinned]) },
  }
}

function makeCyclicContainer(
  varName: string,
  group: readonly string[],
  schemas: { readonly [k: string]: Schema },
  identifiers: ReadonlyMap<string, string>,
  adapter: ComponentAdapter,
  ref?: string,
) {
  const groupIdentifiers = new Map(group.map((name) => [name, identifiers.get(name) ?? name]))
  const localRef = (key: string) => {
    const groupIdent = groupIdentifiers.get(key)
    return groupIdent === undefined ? undefined : `#/$defs/${groupIdent}Schema`
  }
  const keyByLocalRef = new Map(group.map((name) => [localRef(name), name]))
  const memberKey = (member: Schema) =>
    member.$ref === undefined ? undefined : keyByLocalRef.get(member.$ref)
  /**
   * A member localized to `#/$defs/<Ident>Schema` would take that name as its implicit
   * discriminator value, so the schema name is pinned in the mapping, and mapping targets
   * that point into the cycle follow the members to their local refs.
   */
  const localizeDiscriminator = (node: Schema) => {
    const { discriminator } = node
    if (discriminator?.propertyName === undefined) return node
    // The document is not sanitized yet, so a mapping target may not be a string.
    const mapping = Object.entries(discriminator.mapping ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    )
    const mapped = new Set(mapping.map(([, target]) => mappingTargetKey(target)))
    // A mapping key whose target resolves to a schema is another schema's name: an explicit
    // value is never replaced by an implicit one spelled the same. A key whose target
    // resolves nowhere (a reference into another document) names no schema here.
    const taken = new Set(
      mapping.flatMap(([value, target]) => (mappingTargetKey(target) === undefined ? [] : [value])),
    )
    const implicit = [...(node.oneOf ?? []), ...(node.anyOf ?? [])].flatMap((member) => {
      const key = memberKey(member)
      return key === undefined || mapped.has(key) || taken.has(key)
        ? []
        : [[key, member.$ref] as const]
    })
    // A member whose schema name another schema already holds as a mapping key has no
    // value of its own: wrapped in `allOf`, it is no `$ref` the discriminator can name, so
    // the local `#/$defs/<Ident>Schema` name never becomes its value (#74).
    const dropConstraint = (members: readonly Schema[] | undefined) =>
      members?.map((member) => {
        const key = memberKey(member)
        return key !== undefined && !mapped.has(key) && taken.has(key)
          ? { allOf: [member] }
          : member
      })
    const oneOf = dropConstraint(node.oneOf)
    const anyOf = dropConstraint(node.anyOf)
    const isDropped =
      oneOf?.some((member, index) => member !== node.oneOf?.[index]) === true ||
      anyOf?.some((member, index) => member !== node.anyOf?.[index]) === true
    const localized = mapping.map(([value, target]) => {
      const key = mappingTargetKey(target)
      return [value, (key === undefined ? undefined : localRef(key)) ?? target] as const
    })
    const isUnchanged =
      implicit.length === 0 &&
      !isDropped &&
      localized.every(([, target], index) => target === mapping[index]?.[1])
    if (isUnchanged) return node
    const members: [string, unknown][] = []
    if (oneOf !== undefined) members.push(['oneOf', oneOf])
    if (anyOf !== undefined) members.push(['anyOf', anyOf])
    const local = Object.fromEntries([
      ...Object.entries(node),
      ...members,
      [
        'discriminator',
        { ...discriminator, mapping: Object.fromEntries([...localized, ...implicit]) },
      ],
    ])
    return isSchema(local) ? local : node
  }
  const localize = (node: Schema) => {
    const key = node.$ref ? schemaRefToName(node.$ref) : undefined
    if (key === undefined) return localizeDiscriminator(node)
    const groupIdent = groupIdentifiers.get(key)
    if (groupIdent !== undefined) {
      const local = Object.fromEntries([
        ...Object.entries(node),
        ['$ref', `#/$defs/${groupIdent}Schema`],
      ])
      return isSchema(local) ? local : node
    }
    return rewriteCollisionRef(node, identifiers)
  }
  const $defs = Object.fromEntries(
    group.map((name) => [
      `${groupIdentifiers.get(name)}Schema`,
      mapSchema(schemas[name] ?? {}, localize),
    ]),
  )
  return expressionParts(
    adapter,
    { title: varName, $defs },
    ref === undefined ? undefined : { ref },
  )
}

/** The adapter's expression for a declaration, with the comments to write above it. */
function expressionParts(
  adapter: ComponentAdapter,
  schema: Schema,
  options: { readonly ref: string } | undefined,
) {
  return (
    adapter.toExpressionParts?.(schema, undefined, options) ?? {
      expression: adapter.toExpression(schema, undefined, options),
      comments: [],
    }
  )
}

/**
 * The import line a schemas file needs. `cyclic` is true when this file (or
 * the bundled document) contains an Arktype `scope` / TypeBox container
 * cycle — split files that are only `scope({...}).export().Member` still
 * have to import `scope`. `code` is the code the line serves, so an Effect
 * file imports every module it names.
 */
export function schemaImportLine(
  adapter: ComponentAdapter,
  options?: SchemasOptions,
  cyclic = false,
  code?: string,
) {
  const exportTypes = options?.exportTypes === true
  if (!cyclic && !exportTypes && code === undefined) return adapter.renderImport()
  return adapter.renderImport({
    ...(cyclic && { cyclic: true }),
    ...(exportTypes && { exportTypes: true }),
    ...(code !== undefined && { code }),
  })
}

function exportedTypeName(
  ident: string,
  varName: string,
  adapter: ComponentAdapter,
  options: SchemasOptions | undefined,
) {
  if (options?.typeAlias !== 'key') return varName
  return (adapter.reservedTypeNames ?? []).includes(ident) ? `${ident}Type` : ident
}

/**
 * One `export const <X>Schema=...` declaration per `components.schemas` entry,
 * in dependency-first order. Only references inside a `$ref` cycle are lazy
 * (and their declarations get the annotation TypeScript needs); every other
 * reference is a plain identifier, declared earlier.
 */
export function makeSchemaDeclarations(
  schemas: { readonly [k: string]: Schema },
  adapter: ComponentAdapter,
  options?: SchemasOptions,
) {
  const pinned = Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [
      name,
      mapSchema(schema, (node) => pinOwnDiscriminatorValues(node, schemas)),
    ]),
  )
  const prepared = Object.fromEntries(
    Object.entries(pinned).map(([name, schema]) => [
      name,
      options?.readonly === true ? markReadonly(schema) : schema,
    ]),
  )
  const identifiers = makeSchemaIdentifiers(schemas)
  const { order, cycles } = analyzeSchemas(schemas)
  const taken = new Set([
    ...identifiers.values(),
    ...[...identifiers.values()].map((ident) => `${ident}Schema`),
    ...(adapter.reservedTypeNames ?? []),
  ])
  const infer = (varName: string) =>
    adapter.renderTypeInfer(varName).replace(`export type ${varName}=`, '')
  const style = options?.cyclicTypeStyle === 'literal' ? {} : (adapter.cyclicTypeStyle ?? {})
  const declarationRef = options?.ref === true
  return order.map((name) => {
    const schema = mapSchema(prepared[name] ?? {}, (node) => rewriteCollisionRef(node, identifiers))
    const ident = identifiers.get(name) ?? toIdentifierPascalCase(name)
    const varName = `${ident}Schema`
    const group = cycles.get(name)
    const arktypeReadonly = adapter.renderCyclic !== undefined && options?.readonly === true
    const hostRef = declarationRef ? name : undefined
    const container =
      group && adapter.wrapLazy === undefined
        ? makeCyclicContainer(
            varName,
            group,
            arktypeReadonly ? pinned : prepared,
            identifiers,
            adapter,
            adapter.withRef === undefined ? hostRef : undefined,
          )
        : undefined
    const peers = group ?? []
    const rendered =
      container === undefined
        ? undefined
        : (adapter.renderCyclic?.(
            varName,
            container.expression,
            [...new Set(peers.flatMap((peer) => collectSchemaRefs(schemas[peer])))].flatMap(
              (ref) =>
                peers.includes(ref) || !identifiers.has(ref)
                  ? []
                  : [`${identifiers.get(ref)}Schema`],
            ),
          ) ?? container.expression)
    const member = rendered && arktypeReadonly ? `${rendered}.readonly()` : rendered
    const parts =
      container === undefined
        ? expressionParts(
            adapter,
            { ...schema, title: varName },
            adapter.withRef === undefined && hostRef !== undefined ? { ref: hostRef } : undefined,
          )
        : undefined
    const expression = member ?? parts?.expression ?? ''
    const comments = container?.comments ?? parts?.comments
    const leading = comments && comments.length > 0 ? `${comments.join('\n')}\n` : ''
    const body = adapter.wrapLazy
      ? wrapReferences(
          expression,
          new Set((group ?? []).map((peer) => `${identifiers.get(peer)}Schema`)),
          adapter.wrapLazy,
        )
      : expression
    const value = options?.wrapDeclaration
      ? options.wrapDeclaration(body, name)
      : hostRef !== undefined && adapter.withRef
        ? adapter.withRef(body, name)
        : body
    const helper = group && adapter.cyclicAnnotation ? claimName(`${ident}Type`, taken) : undefined
    const annotationText = helper ? adapter.cyclicAnnotation?.(helper) : undefined
    // Keep the helper only when the annotation names it; otherwise it is unused.
    const usesHelper = helper !== undefined && annotationText?.includes(helper) === true
    if (helper && usesHelper) taken.add(helper)
    const typeDef =
      helper && usesHelper
        ? `${makeCyclicType(name, helper, schema, (ref) => infer(`${identifiers.get(ref) ?? toIdentifierPascalCase(ref)}Schema`), options?.readonly === true, style)}\n\n`
        : ''
    const annotation = annotationText === undefined ? '' : `:${annotationText}`
    const typeExport =
      options?.exportTypes === true
        ? `\n\nexport type ${exportedTypeName(ident, varName, adapter, options)}=${infer(varName)}`
        : ''
    const containerCycle = group !== undefined && adapter.wrapLazy === undefined
    const code = `${typeDef}${leading}export const ${varName}${annotation}=${value}${typeExport}`
    return {
      name,
      varName,
      fileName: declarationFileName(ident),
      importLine: schemaImportLine(adapter, options, containerCycle, code),
      code,
    }
  })
}

/**
 * The import line and every `components.schemas` declaration, in dependency
 * order. Returns `''` when schemas are missing or empty.
 */
export function makeSchemasCode(
  components: Components,
  adapter: ComponentAdapter,
  options?: SchemasOptions,
) {
  const { schemas } = components
  if (!schemas) return ''
  const declarations = makeSchemaDeclarations(schemas, adapter, options)
  if (declarations.length === 0) return ''
  const cyclic = declarations.some(
    (declaration) =>
      declaration.importLine !== schemaImportLine(adapter, options, false, declaration.code),
  )
  const code = declarations.map((declaration) => declaration.code).join(';')
  const imports = schemaImportLine(adapter, options, cyclic, code)
  return `${imports}\n\n${code}\n`
}
