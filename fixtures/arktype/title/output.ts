import { type } from 'arktype'

export const User = type({ name: 'string', email: 'string.email' })

export type User = typeof User.infer
