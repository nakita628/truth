import { type } from 'arktype'

export const Schema = type({
  pair: type('string[]').and(type('unknown[] == 2')),
  'range?': type('number[]').and(type('1 <= unknown[] <= 3')),
})

export type Schema = typeof Schema.infer
