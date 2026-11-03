import { type } from 'arktype'

const MergedInner = type(
  type({
    name: type('string').narrow(
      (data, ctx) => [...data].length >= 3 || ctx.mustBe('at least 3 characters'),
    ),
  }),
).and(type({ age: 'number.integer >= 0' }))

export const Merged = type('unknown').narrow((data, ctx) => {
  const result = MergedInner(data)
  if (result instanceof type.errors) {
    for (const issue of result)
      ctx.reject({ message: 'merged validation failed', path: issue.path })
    return false
  }
  return true
})

export type Merged = typeof MergedInner.infer
