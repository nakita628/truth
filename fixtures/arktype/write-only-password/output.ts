import { type } from 'arktype'

export const Account = type({ 'name?': 'string', 'password?': 'string' })

export type Account = typeof Account.infer
