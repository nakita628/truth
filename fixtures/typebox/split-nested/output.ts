import { Type, type Static } from 'typebox'

export const Order = Type.Object({
  id: Type.Integer(),
  customer: Type.Object({
    name: Type.String(),
    email: Type.String({ format: 'email' }),
    address: Type.Optional(Type.Object({ street: Type.String(), city: Type.String() })),
  }),
  status: Type.Union([Type.Literal('pending'), Type.Literal('shipped'), Type.Literal('delivered')]),
})

export type Order = Static<typeof Order>
