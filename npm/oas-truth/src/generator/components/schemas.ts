import type { ComponentAdapter } from '../../adapter/index.js'
import {
  componentSchemaKey,
  isSchema,
  listOf,
  mapSchema,
  mappingTargetKey,
  pinOwnDiscriminatorValues,
} from '../../helper/discriminator.js'
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
   * `import { scope } from 'arktype'`, and `type` too when its code calls it; a
   * non-cyclic file imports `type` only when it calls it, and is `''` (no import) when it
   * calls neither, such as a `$ref` alias.
   */
  readonly importLine: string
  readonly code: string
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
  return rewriteRef(rewriteMappingTargets(node, identifiers), identifiers)
}

/** The node's own `$ref` renamed by a collision; its mapping is left as it is. */
function rewriteRef(node: Schema, identifiers: ReadonlyMap<string, string>): Schema {
  if (typeof node.$ref !== 'string' || !node.$ref.startsWith('#/components/schemas/')) return node
  const ident = renamedIdentifier(schemaRefToName(node.$ref), identifiers)
  return ident === undefined ? node : { ...node, $ref: `#/components/schemas/${ident}` }
}

/** The identifier a component key was renamed to by a collision, or undefined when it kept its own. */
function renamedIdentifier(key: string, identifiers: ReadonlyMap<string, string>) {
  const ident = identifiers.get(key)
  return ident === undefined || ident === toIdentifierPascalCase(key) ? undefined : ident
}

/**
 * The discriminator `mapping` targets follow a collision rename as the members' `$ref`s do,
 * so a target still names the schema its key meant (a bare name included).
 */
function rewriteMappingTargets(node: Schema, identifiers: ReadonlyMap<string, string>): Schema {
  const { discriminator } = node
  if (!isSchema(discriminator) || !isRecord(discriminator.mapping)) return node
  const entries = Object.entries(discriminator.mapping)
  const renamed = entries.map(([value, target]) => {
    const key = typeof target === 'string' ? mappingTargetKey(target) : undefined
    const ident = key === undefined ? undefined : renamedIdentifier(key, identifiers)
    return [value, ident === undefined ? target : `#/components/schemas/${ident}`] as const
  })
  if (renamed.every(([, target], index) => target === entries[index]?.[1])) return node
  return { ...node, discriminator: { ...discriminator, mapping: Object.fromEntries(renamed) } }
}

/**
 * Pins the schema key as the discriminator value of an unmapped member whose identifier a
 * collision renamed: its implicit value is the schema name, but once its `$ref` names the
 * suffixed identifier (`FooBar2`), that is what a generator would read. Runs before the
 * rename, so the pinned target is the member's own `$ref`, renamed with the rest.
 */
function pinRenamedMemberValues(node: Schema, identifiers: ReadonlyMap<string, string>) {
  const { discriminator } = node
  if (!isSchema(discriminator) || typeof discriminator.propertyName !== 'string') return node
  const mapping = Object.entries(isRecord(discriminator.mapping) ? discriminator.mapping : {})
  const mapped = new Set(
    mapping.map(([, target]) =>
      typeof target === 'string' ? mappingTargetKey(target) : undefined,
    ),
  )
  // A mapping key whose target resolves is another schema's value, so a renamed member whose
  // name spells it has no value of its own (#74).
  const taken = new Set(
    mapping.flatMap(([value, target]) =>
      typeof target === 'string' && mappingTargetKey(target) !== undefined ? [value] : [],
    ),
  )
  const renamedKey = (member: unknown) => {
    if (!isSchema(member) || typeof member.$ref !== 'string') return undefined
    const key = componentSchemaKey(member.$ref)
    if (key === undefined || mapped.has(key)) return undefined
    return renamedIdentifier(key, identifiers) === undefined ? undefined : key
  }
  // A mapping key whose target resolves nowhere here (another document) names no schema, so
  // the member still takes its key, as `localizeDiscriminator` decides.
  const pinned = [...listOf(node.oneOf), ...listOf(node.anyOf)].flatMap((member) => {
    const key = renamedKey(member)
    return key === undefined || taken.has(key) || !isSchema(member)
      ? []
      : [[key, member.$ref] as const]
  })
  // Wrapped in `allOf`, it is no `$ref` the discriminator can read a value from.
  const unconstrained = (members: unknown): readonly unknown[] =>
    listOf(members).map((member: unknown) => {
      const key = renamedKey(member)
      return key !== undefined && taken.has(key) ? { allOf: [member] } : member
    })
  const oneOf = unconstrained(node.oneOf)
  const anyOf = unconstrained(node.anyOf)
  const isWrapped =
    listOf(oneOf).some((member, index) => member !== listOf(node.oneOf)[index]) ||
    listOf(anyOf).some((member, index) => member !== listOf(node.anyOf)[index])
  if (pinned.length === 0 && !isWrapped) return node
  const entries: [string, unknown][] = Object.entries(node)
  if (Array.isArray(node.oneOf)) entries.push(['oneOf', oneOf])
  if (Array.isArray(node.anyOf)) entries.push(['anyOf', anyOf])
  entries.push([
    'discriminator',
    { ...discriminator, mapping: Object.fromEntries([...mapping, ...pinned]) },
  ])
  const next: unknown = Object.fromEntries(entries)
  return isSchema(next) ? next : node
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
  // A node's discriminator is localized whether or not a `$ref` sits beside it (OAS 3.1),
  // and a mapping target left outside the cycle follows a collision rename.
  const localize = (node: Schema) => {
    const discriminated = rewriteMappingTargets(localizeDiscriminator(node), identifiers)
    const key = discriminated.$ref ? schemaRefToName(discriminated.$ref) : undefined
    if (key === undefined) return discriminated
    const groupIdent = groupIdentifiers.get(key)
    if (groupIdent !== undefined) {
      const local = Object.fromEntries([
        ...Object.entries(discriminated),
        ['$ref', `#/$defs/${groupIdent}Schema`],
      ])
      return isSchema(local) ? local : discriminated
    }
    // The mapping is already renamed above; renaming it again would chain the renames.
    return rewriteRef(discriminated, identifiers)
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
  const identifiers = makeSchemaIdentifiers(schemas)
  const pinned = Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [
      name,
      mapSchema(schema, (node) =>
        pinRenamedMemberValues(pinOwnDiscriminatorValues(node, schemas), identifiers),
      ),
    ]),
  )
  const prepared = Object.fromEntries(
    Object.entries(pinned).map(([name, schema]) => [
      name,
      options?.readonly === true ? markReadonly(schema) : schema,
    ]),
  )
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
    const original = prepared[name] ?? {}
    // The cyclic type reads each `$ref` by its component key (a self reference against
    // `name`, a peer through `identifiers`), so it takes the schema before the rename (#149).
    const schema = mapSchema(original, (node) => rewriteCollisionRef(node, identifiers))
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
        ? `${makeCyclicType(name, helper, original, (ref) => infer(`${identifiers.get(ref) ?? toIdentifierPascalCase(ref)}Schema`), options?.readonly === true, style)}\n\n`
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
  return imports === '' ? `${code}\n` : `${imports}\n\n${code}\n`
}
