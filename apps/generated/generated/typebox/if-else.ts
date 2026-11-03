import { Type, type Static } from 'typebox'

export const Vehicle = Type.Object(
  { type: Type.Union([Type.Literal('car'), Type.Literal('truck')]) },
  {
    if: Type.Object({ type: Type.Optional(Type.Literal('truck')) }),
    then: Type.Object({ cargoCapacity: Type.Number({ minimum: 0 }) }),
    else: Type.Object({ passengerCount: Type.Integer({ minimum: 1 }) }),
  },
)
