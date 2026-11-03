import { scope } from 'arktype'

const types = scope({
  Address: { street: 'string', city: 'string' },
  User: { name: 'string', 'address?': 'Address' },
}).export()

export const User = types.User

export type User = typeof User.infer
