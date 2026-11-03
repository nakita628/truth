import { type } from 'arktype'

export const User = type({
  name: 'string',
  'address?': type({ street: 'string', city: 'string', 'zip?': 'string' }),
})

export type User = typeof User.infer
