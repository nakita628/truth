import { DEFINITION_REF_PREFIXES } from '../constants/index.js'
import type { JSONSchema, Ref } from '../parser/index.js'

type Definitions = { readonly [name: string]: JSONSchema }

/** The definition name a `$ref` names and the prefix it is written with. */
function refParts(
  ref: string,
):
  | { readonly prefix: (typeof DEFINITION_REF_PREFIXES)[number]; readonly name: string }
  | undefined {
  for (const prefix of DEFINITION_REF_PREFIXES) {
    if (!ref.startsWith(prefix)) continue
    const rest = ref.slice(prefix.length)
    if (rest === '' || rest.includes('/')) return undefined
    return { prefix, name: decodeURIComponent(rest) }
  }
  return undefined
}

/** A definition's own shape: the definition without the union that lists its subtypes. */
function baseOf(schema: JSONSchema): JSONSchema {
  const { oneOf: _oneOf, anyOf: _anyOf, discriminator: _discriminator, ...base } = schema
  return base
}

/**
 * Break the cycle of a polymorphic base: a definition whose `oneOf` / `anyOf` lists its
 * subtypes while each subtype extends it through `allOf: [{ $ref: base }, ...]` (the
 * OpenAPI discriminator inheritance pattern). Read literally the base is a union of its
 * subtypes and each subtype contains the base, which loops forever.
 *
 * In a subtype's `allOf` the base stands for its own shape only, so that member is
 * pointed at a new `<Base>Base` definition holding the base without its union. The base
 * itself stays the union of its subtypes.
 *
 * Returns `definitions` unchanged when no definition has that shape.
 */
export function separatePolymorphicBases(definitions: Definitions): Definitions {
  const result: { [name: string]: JSONSchema } = { ...definitions }
  let changed = false
  for (const [name, schema] of Object.entries(definitions)) {
    const members = schema.oneOf ?? schema.anyOf
    if (members === undefined || members.length === 0) continue
    const subtypes = members.flatMap((member) => {
      const parts = member.$ref === undefined ? undefined : refParts(member.$ref)
      return parts === undefined ? [] : [parts.name]
    })
    const extending = subtypes.filter((subtype) =>
      definitions[subtype]?.allOf?.some(
        (member) => member.$ref !== undefined && refParts(member.$ref)?.name === name,
      ),
    )
    if (extending.length === 0) continue
    changed = true
    const baseName = unusedName(`${name}Base`, result)
    result[baseName] = baseOf(schema)
    for (const subtype of extending) {
      const subtypeSchema = result[subtype]
      if (subtypeSchema?.allOf === undefined) continue
      result[subtype] = {
        ...subtypeSchema,
        allOf: subtypeSchema.allOf.map((member) => {
          const parts = member.$ref === undefined ? undefined : refParts(member.$ref)
          return parts?.name === name
            ? withRef(member, `${parts.prefix}${encodeURIComponent(baseName)}`)
            : member
        }),
      }
    }
  }
  return changed ? result : definitions
}

function withRef(schema: JSONSchema, $ref: Ref): JSONSchema {
  return { ...schema, $ref }
}

function unusedName(name: string, taken: Definitions): string {
  if (!Object.hasOwn(taken, name)) return name
  let index = 2
  while (Object.hasOwn(taken, `${name}${index}`)) index += 1
  return `${name}${index}`
}

/**
 * A document with {@link separatePolymorphicBases} applied to its `$defs` and
 * `definitions`; the document itself when neither changes.
 */
export function withPolymorphicBases(schema: JSONSchema): JSONSchema {
  const $defs = schema.$defs === undefined ? undefined : separatePolymorphicBases(schema.$defs)
  const definitions =
    schema.definitions === undefined ? undefined : separatePolymorphicBases(schema.definitions)
  if ($defs === schema.$defs && definitions === schema.definitions) return schema
  return {
    ...schema,
    ...($defs !== undefined && { $defs }),
    ...(definitions !== undefined && { definitions }),
  }
}
