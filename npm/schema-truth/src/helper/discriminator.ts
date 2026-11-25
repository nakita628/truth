import { DEFINITION_REF_PREFIXES } from '../constants/index.js'
import { isSchemaObject } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import type { SchemaDefinitions } from './schema.js'

function definitionName(ref: string) {
  for (const prefix of DEFINITION_REF_PREFIXES) {
    if (!ref.startsWith(prefix)) continue
    const rest = ref.slice(prefix.length)
    if (rest === '' || rest.includes('/')) return undefined
    return decodeURIComponent(rest)
  }
  return undefined
}

/**
 * The string values a schema's own `propertyName` property is held to (`const`, or the
 * strings of `enum`), read from its `properties` or from those of an `allOf` member;
 * `undefined` when it holds the property to no fixed value.
 */
function ownDiscriminatorValues(
  schema: JSONSchema,
  propertyName: string,
): readonly string[] | undefined {
  const holders = [schema, ...(schema.allOf ?? [])]
  for (const holder of holders) {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- the document is parsed JSON, never checked against the type: a null can sit where the type says a schema
    if (typeof holder !== 'object' || holder === null) continue
    const property = holder.properties?.[propertyName]
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- parsed JSON: a null can sit where the type says a schema
    if (property === null || !isSchemaObject(property)) continue
    if (typeof property.const === 'string') return [property.const]
    const values = (property.enum ?? []).filter((value) => typeof value === 'string')
    if (values.length > 0) return values
  }
  return undefined
}

/**
 * The own values each unmapped member keeps: those no other member, mapping key or
 * fallback name also claims, since a shared value would not tell the members apart. A
 * member left with none falls back to its name (`undefined` here), and that name is then
 * claimed too, until nothing changes. A name that is already a mapping key for another
 * schema is no fallback: that member is left unconstrained instead.
 */
function distinctOwnValues(
  mappingKeys: readonly string[],
  members: readonly ({ name: string; own: readonly string[] | undefined } | undefined)[],
) {
  const mappingKeySet = new Set(mappingKeys)
  const counts = new Map<string, number>()
  for (const value of [...mappingKeys, ...members.flatMap((member) => [...new Set(member?.own)])]) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const settle = (chosen: readonly (readonly string[] | undefined)[]): typeof chosen => {
    const fallbacks = new Set(
      members.flatMap((member, index) =>
        member !== undefined && chosen[index] === undefined && !mappingKeySet.has(member.name)
          ? [member.name]
          : [],
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
    members.map((member) => {
      const kept = member?.own?.filter((value) => counts.get(value) === 1) ?? []
      return kept.length > 0 ? kept : undefined
    }),
  )
}

/**
 * The discriminator values that select each `oneOf` / `anyOf` member (OpenAPI 3.x
 * Discriminator Object): the `mapping` keys whose target names the member's `$ref`; when
 * the mapping names it nowhere, the values the member's own discriminator property is held
 * to (`const` / `enum`), less any another member, a mapping key or a fallback name also
 * claims; and when none is left, the definition name itself (the specification's implicit
 * mapping), unless that name is already a mapping key for another schema, in which case the
 * member is left unconstrained (`values: undefined`). Preferring
 * the member's own values departs from the
 * specification on purpose: a document such as OpenAI's `CompoundFilter`, whose member
 * declares `type: { enum: [eq, ne] }`, means those values, and its schema name could never
 * match. A member's `values` is `undefined` when it is not a `$ref` the mapping can name,
 * and the whole result is `undefined` when the node has no discriminator property.
 */
export function discriminatedMembers(
  schema: JSONSchema,
  members: readonly JSONSchema[],
  definitions?: SchemaDefinitions,
) {
  const propertyName = schema.discriminator?.propertyName
  if (propertyName === undefined) return undefined
  const mapping = Object.entries(schema.discriminator?.mapping ?? {})
  const resolved = members.map((member) => {
    const name = member.$ref === undefined ? undefined : definitionName(member.$ref)
    if (name === undefined) return { member, name, mapped: [], own: undefined }
    const mapped = mapping
      .filter(([, target]) => target === member.$ref || definitionName(target) === name)
      .map(([value]) => value)
    const definition =
      definitions !== undefined && Object.hasOwn(definitions, name) ? definitions[name] : undefined
    const own =
      mapped.length > 0 || definition === undefined
        ? undefined
        : ownDiscriminatorValues(definition, propertyName)
    return { member, name, mapped, own }
  })
  const mappingKeys = mapping.map(([value]) => value)
  const mappingKeySet = new Set(mappingKeys)
  const chosen = distinctOwnValues(
    mappingKeys,
    resolved.map(({ name, mapped, own }) =>
      name === undefined || mapped.length > 0 ? undefined : { name, own },
    ),
  )
  return {
    propertyName,
    members: resolved.map(({ member, name, mapped }, index) => {
      if (name === undefined) return { member, values: undefined }
      if (mapped.length > 0) return { member, values: mapped }
      const values = chosen[index]
      if (values !== undefined) return { member, values }
      return { member, values: mappingKeySet.has(name) ? undefined : [name] }
    }),
  }
}
