import { type } from 'arktype'

export const Messaged = type({
  'n?': type('unknown')
    .narrow((data, ctx) => typeof data !== 'number' || data >= 5 || ctx.mustBe('low'))
    .narrow((data, ctx) => typeof data !== 'number' || data <= 9 || ctx.mustBe('high')),
})

export type Messaged = typeof Messaged.infer
