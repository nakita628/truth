import { Type, type Static } from 'typebox'

export const Order = Type.Object({
  id: Type.Integer(),
  customer: Type.Object({
    name: Type.String({ minLength: 1 }),
    email: Type.String({ format: 'email' }),
  }),
  items: Type.Array(
    Type.Object({
      name: Type.String(),
      price: Type.Number({ minimum: 0 }),
      quantity: Type.Integer({ minimum: 1 }),
    }),
  ),
  status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('confirmed'),
    Type.Literal('shipped'),
    Type.Literal('delivered'),
  ]),
})

export type Order = Static<typeof Order>
