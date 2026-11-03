import { type } from 'arktype'

export const Order = type({
  id: 'number.integer',
  customer: type({
    name: 'string',
    email: 'string.email',
    'address?': type({ street: 'string', city: 'string' }),
  }),
  status: "'pending' | 'shipped' | 'delivered'",
})

export type Order = typeof Order.infer
