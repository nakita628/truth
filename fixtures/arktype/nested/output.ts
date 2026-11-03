import { type } from 'arktype'

export const Order = type({
  id: 'number.integer',
  customer: type({
    name: type('string').narrow(
      (data, ctx) => [...data].length >= 1 || ctx.mustBe('at least 1 character'),
    ),
    email: 'string.email',
  }),
  items: type(
    type({ name: 'string', price: 'number >= 0', quantity: 'number.integer >= 1' }),
  ).array(),
  status: "'pending' | 'confirmed' | 'shipped' | 'delivered'",
})

export type Order = typeof Order.infer
