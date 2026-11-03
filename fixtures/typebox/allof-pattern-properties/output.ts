import { Type, type Static } from 'typebox'

export const Extended = Type.Intersect([Type.Object({ a: Type.Optional(Type.String()) })], {
  patternProperties: { '^x-': Type.String() },
  unevaluatedProperties: false,
})

export type Extended = Static<typeof Extended>
