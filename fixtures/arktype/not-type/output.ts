import { type } from 'arktype'

export const Schema = type({
  'review_target?': type(
    type('string')
      .narrow((data, ctx) => [...data].length >= 1 || ctx.mustBe('at least 1 character'))
      .narrow((data, ctx) => [...data].length <= 96 || ctx.mustBe('at most 96 characters')),
  ).or('null'),
  id: type('string | null').narrow((data: unknown) => !['root'].includes(data as never)),
})

export type Schema = typeof Schema.infer
