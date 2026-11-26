import { type } from 'arktype'

export const Closed = type({
  'box?': type(type(type({ 'a?': 'string' })).and(type({ 'b?': 'string' }))).and(
    type(type({})).and({ '[/^(?!(?:a|b)$)/]': 'never' }),
  ),
})

export type Closed = typeof Closed.infer
