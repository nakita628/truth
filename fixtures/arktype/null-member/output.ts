import { type } from 'arktype'

export const Schema = type({ name: 'string | null', 'count?': 'number.integer >= 0 | null' })

export type Schema = typeof Schema.infer
