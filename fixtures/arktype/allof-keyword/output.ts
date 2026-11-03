import { type } from 'arktype'

export const Bounded = type('number.integer >= 5')

export type Bounded = typeof Bounded.infer
