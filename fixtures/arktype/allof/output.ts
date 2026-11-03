import { type } from 'arktype'

export const Combined = type(type({ name: 'string' })).and(type({ age: 'number' }))

export type Combined = typeof Combined.infer
