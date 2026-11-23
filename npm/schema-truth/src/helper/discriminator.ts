import { DEFINITION_REF_PREFIXES } from '../constants/index.js'
import type { JSONSchema } from '../parser/index.js'

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
 * The discriminator values that select each `oneOf` / `anyOf` member (OpenAPI 3.x
 * Discriminator Object): the `mapping` keys whose target names the member's `$ref`, or,
 * when the mapping names it nowhere, the definition name itself (the implicit mapping).
 * A member's `values` is `undefined` when it is not a `$ref` the mapping can name, and the
 * whole result is `undefined` when the node has no discriminator property.
 */
export function discriminatedMembers(schema: JSONSchema, members: readonly JSONSchema[]) {
  const propertyName = schema.discriminator?.propertyName
  if (propertyName === undefined) return undefined
  const mapping = Object.entries(schema.discriminator?.mapping ?? {})
  return {
    propertyName,
    members: members.map((member) => {
      const name = member.$ref === undefined ? undefined : definitionName(member.$ref)
      if (name === undefined) return { member, values: undefined }
      const mapped = mapping
        .filter(([, target]) => target === member.$ref || definitionName(target) === name)
        .map(([value]) => value)
      return { member, values: mapped.length > 0 ? mapped : [name] }
    }),
  }
}
