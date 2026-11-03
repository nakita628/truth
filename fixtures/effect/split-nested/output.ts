import { Schema } from 'effect'

export const Order = Schema.Struct({
  id: Schema.Number.check(Schema.isInt()),
  customer: Schema.Struct({
    name: Schema.String,
    email: Schema.String.check(
      Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
    ),
    address: Schema.optionalKey(Schema.Struct({ street: Schema.String, city: Schema.String })),
  }),
  status: Schema.Literals(['pending', 'shipped', 'delivered']),
})

export type Order = typeof Order.Type
