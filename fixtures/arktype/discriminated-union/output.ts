import { type } from 'arktype'

export const Animal = type(type({ kind: "'cat'", meow: 'boolean' })).or(
  type({ kind: "'dog'", bark: 'boolean' }),
)

export type Animal = typeof Animal.infer
