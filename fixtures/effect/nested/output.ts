import { Schema } from 'effect'

export const Order = Schema.Struct({
  id: Schema.Number.check(Schema.isInt()),
  customer: Schema.Struct({
    name: Schema.String.check(
      Schema.makeFilter((input) => [...input].length >= 1, {
        expected: 'a string of at least 1 character',
      }),
    ),
    email: Schema.String.check(
      Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
    ),
  }),
  items: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      price: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
      quantity: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
    }),
  ),
  status: Schema.Literals(['pending', 'confirmed', 'shipped', 'delivered']),
})

export type Order = typeof Order.Type
