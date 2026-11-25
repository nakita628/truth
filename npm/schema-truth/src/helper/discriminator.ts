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
 * The discriminator values that select each `oneOf` / `anyOf` member (OpenAPI 3.x
 * Discriminator Object): the `mapping` keys whose target names the member's `$ref`; when
 * the mapping names it nowhere, the values the member's own discriminator property is held
 * to (`const` / `enum`), unless another member or a mapping key claims one of them; and
 * otherwise the definition name itself (the specification's implicit mapping). Preferring
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
  // A value another member or a mapping key also claims would not tell the members apart
  // (every member inlining the same `enum`), so such a member keeps its schema name.
  const claims = new Map<string, number>()
  const claim = (value: string) => claims.set(value, (claims.get(value) ?? 0) + 1)
  for (const [value] of mapping) claim(value)
  for (const { own } of resolved) for (const value of new Set(own)) claim(value)
  return {
    propertyName,
    members: resolved.map(({ member, name, mapped, own }) => {
      if (name === undefined) return { member, values: undefined }
      if (mapped.length > 0) return { member, values: mapped }
      const isOwnDistinct = own?.every((value) => claims.get(value) === 1) === true
      return { member, values: isOwnDistinct ? own : [name] }
    }),
  }
}
