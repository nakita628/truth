import { Type, type Static } from 'typebox'

export const Keys = Type.Object({
  prefixed: Type.Optional(Type.Object({}, { propertyNames: Type.String({ pattern: '^a' }) })),
  listed: Type.Optional(
    Type.Object({}, { propertyNames: Type.Union([Type.Literal('x'), Type.Literal('y')]) }),
  ),
  none: Type.Optional(Type.Object({}, { propertyNames: Type.Never() })),
  either: Type.Optional(
    Type.Object(
      {},
      {
        propertyNames: Type.Union([Type.String({ pattern: '^a' }), Type.String({ pattern: '^b' })]),
      },
    ),
  ),
})

export type Keys = Static<typeof Keys>
