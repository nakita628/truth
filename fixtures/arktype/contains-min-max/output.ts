import { type } from 'arktype'

export const IntList = type('unknown[]')
  .narrow(
    (data: unknown[], ctx) =>
      data.filter((item) => type('number.integer').allows(item)).length >= 2 ||
      ctx.mustBe('must contain at least 2 matching items'),
  )
  .narrow(
    (data: unknown[], ctx) =>
      data.filter((item) => type('number.integer').allows(item)).length <= 3 ||
      ctx.mustBe('must contain at most 3 matching items'),
  )

export type IntList = typeof IntList.infer
