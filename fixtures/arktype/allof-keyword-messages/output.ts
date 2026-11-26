import { type } from 'arktype'

export const Messaged = type({
  'n?': type('unknown')
    .narrow((data, ctx) => typeof data !== 'number' || data >= 5 || ctx.mustBe('low'))
    .narrow((data, ctx) => typeof data !== 'number' || data <= 9 || ctx.mustBe('high')),
  's?': type('unknown').narrow(
    (data, ctx) =>
      ((typeof data !== 'string' || data.length >= 3) &&
        (typeof data !== 'string' || /^a/.test(data))) ||
      ctx.mustBe('bad'),
  ),
})

export type Messaged = typeof Messaged.infer
