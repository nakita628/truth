import { type } from 'arktype'

export const Closed = type({
  'box?': type(type(type({ 'a?': 'string' })).and(type({ 'b?': 'string' }))).and(
    type(
      type('unknown').narrow(
        (data: unknown) => typeof data !== 'object' || data === null || Array.isArray(data),
      ),
    ).or(type(type({})).and({ '[/^(?!(?:a|b)$)/]': 'never' })),
  ),
  'either?': type(type('string').or(type({ 'a?': 'number' }))).and(
    type(
      type('unknown').narrow(
        (data: unknown) => typeof data !== 'object' || data === null || Array.isArray(data),
      ),
    ).or(type(type({})).and({ '[/^(?!(?:a)$)/]': 'never' })),
  ),
  filled: type(type({})).and(
    type(
      type('unknown').narrow(
        (data: unknown) => typeof data !== 'object' || data === null || Array.isArray(data),
      ),
    ).or(type(type({})).and({ '[/^/]': 'never' })),
  ),
})

export type Closed = typeof Closed.infer
