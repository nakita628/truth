// FIXME: JSON Schema `not` is not enforced by this generator; TypeBox v1 has no runtime `Type.Not` and `Value.Check` ignores the keyword (the schema is generated without it)

import { Type, type Static } from 'typebox'

export const Schema = Type.Object({
  review_target: Type.Optional(
    Type.Union([Type.String({ minLength: 1, maxLength: 96 }), Type.Null()]),
  ),
  id: Type.Union([Type.String(), Type.Null()]),
})

export type Schema = Static<typeof Schema>
