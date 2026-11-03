import { type } from 'arktype'

export const PatternBag = type({})
  .narrow((data) =>
    Object.entries(data).every(
      ([key, value]) => !new RegExp('^S:').test(key) || type('string').allows(value),
    ),
  )
  .narrow((data) =>
    Object.entries(data).every(
      ([key, value]) => !new RegExp('^I:').test(key) || type('number.integer').allows(value),
    ),
  )

export type PatternBag = typeof PatternBag.infer
