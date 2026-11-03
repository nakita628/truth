import { type } from 'arktype'

export const Tuple = type(['string', 'boolean', '...', 'number.integer[]'])

export type Tuple = typeof Tuple.infer
