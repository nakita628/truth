import { type } from 'arktype'

export const Schema = type({ name: 'string', 'age?': 'number' })

export type Schema = typeof Schema.infer
