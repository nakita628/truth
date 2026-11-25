import { type } from 'arktype'

export const Shadowed = type({
  'typed?': type({ 'a?': 'string' }).narrow((data) =>
    Object.entries(data).every(
      ([key, value]) => ['a'].includes(key) || type('string').allows(value),
    ),
  ),
  'open?': type({ 'a?': 'string', '+': 'delete' }),
})

export type Shadowed = typeof Shadowed.infer
