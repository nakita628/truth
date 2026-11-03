import { type } from 'arktype'

export const Code = type({
  code: type('string').narrow(
    (data, ctx) => [...data].length === 6 || ctx.mustBe('Code must be exactly 6 characters'),
  ),
})

export type Code = typeof Code.infer
