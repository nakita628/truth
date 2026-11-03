// FIXME: JSON Schema `not` is not enforced by this generator; TypeBox v1 has no runtime `Type.Not` and `Value.Check` ignores the keyword (falls back to `Type.Any()`)

import { Type, type Static } from 'typebox'

export const Conditional = Type.Object(
  { kind: Type.String(), value: Type.Optional(Type.String()) },
  {
    if: Type.Object({ kind: Type.Optional(Type.Literal('named')) }),
    then: Type.Any(),
    else: Type.Any(),
  },
)

export type Conditional = Static<typeof Conditional>
