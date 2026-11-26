import type { Schema } from '../openapi/index.js'
import { isRecord, schemaRefToName } from '../utils/index.js'

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

export function isSchema(value: unknown): value is Schema {
  return isRecord(value)
}

/** Rewrites a schema bottom-up with `rewrite`, following only subschemas (never example or default values). */
export function mapSchema(schema: Schema, rewrite: (node: Schema) => Schema) {
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

/** The component key a `#/components/schemas/...` reference names; undefined for any other reference. */
export function componentSchemaKey(ref: string) {
  return ref.startsWith('#/components/schemas/') ? schemaRefToName(ref) : undefined
}

/**
 * The component key a discriminator `mapping` target names: a `#/components/schemas/...`
 * reference, or a bare schema name, which the Discriminator Object also allows.
 */
export function mappingTargetKey(target: string) {
  return target.includes('#') || target.includes('/') ? componentSchemaKey(target) : target
}

/** A keyword's value as a list, or none when the unsanitized document holds something else. */
export function listOf(value: unknown): readonly unknown[] {
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
export function pinOwnDiscriminatorValues(node: Schema, schemas: { readonly [k: string]: Schema }) {
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

/**
 * An inline schema with each discriminator's unmapped members pinned to their own values,
 * as `components.schemas` declarations get them: a discriminator reads the same wherever it
 * is written (#109).
 */
export function pinInlineDiscriminatorValues(
  schema: Schema,
  schemas: { readonly [k: string]: Schema } | undefined,
) {
  return schemas === undefined
    ? schema
    : mapSchema(schema, (node) => pinOwnDiscriminatorValues(node, schemas))
}
