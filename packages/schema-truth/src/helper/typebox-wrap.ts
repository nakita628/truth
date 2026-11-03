import { isNullable } from '../guard/index.js'
import type { JSONSchema } from '../parser/index.js'
import { hasKeptDefault } from './schema.js'
import type { SchemaDefinitions } from './schema.js'

/**
 * Wraps a TypeBox schema string with `Type.Union([..., Type.Null()])` (when nullable),
 * `Type.Readonly()` (on `x-readonly`) and, outermost, `Type.Optional()` when a `default`
 * is present: the modifier has to sit on the property schema itself for `Type.Object` to
 * read the key as optional, so it goes outside the union.
 *
 * Metadata (`description`, `examples`, `deprecated`, `externalDocs`,
 * `readOnly`, `writeOnly`) is NOT handled here. Each TypeBox factory call
 * (`Type.String`, `Type.Object`, `Type.Array`, etc.) embeds metadata directly
 * into its own options argument via {@link typeboxMetaOpts} at construction
 * time, because TypeBox stores metadata on the schema object during
 * construction and exposes no post-construction `.meta()` method.
 */
export function typeboxWrap(
  typeboxStr: string,
  schema: JSONSchema,
  definitions?: SchemaDefinitions,
): string {
  const withNullable = isNullable(schema) ? `Type.Union([${typeboxStr},Type.Null()])` : typeboxStr
  const withReadonly =
    schema['x-readonly'] === true ? `Type.Readonly(${withNullable})` : withNullable
  // TypeBox v1's `Type.Optional(type)` takes one arg; the default value itself is
  // baked into `typeboxStr`'s own options by the factory (`typeboxDefaultOpt`).
  // Here we only mark the property optional when a (kept) default is present.
  return hasKeptDefault(schema, definitions) ? `Type.Optional(${withReadonly})` : withReadonly
}
