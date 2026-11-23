import { scope, type } from 'arktype'

const types = scope({
  Big: 'bigint',
  Limits: {
    'between?': type('bigint')
      .narrow((data, ctx) => data >= BigInt(1) || ctx.mustBe('at least 1'))
      .narrow((data, ctx) => data > BigInt(5) || ctx.mustBe('more than 5'))
      .narrow((data, ctx) => data <= BigInt(10) || ctx.mustBe('at most 10'))
      .narrow((data, ctx) => data < BigInt(8) || ctx.mustBe('less than 8')),
    'large?': type('bigint | number.integer')
      .or(/^-?\d+$/)
      .pipe((data) => BigInt(data))
      .narrow(
        (data, ctx) =>
          (data >= -9223372036854775808n && data <= 9223372036854775807n) || ctx.mustBe('an int64'),
      ),
    'level?': type('bigint | number.integer')
      .or(/^-?\d+$/)
      .pipe((data) => BigInt(data))
      .to('9007199254740992n | 2n'),
    'big?': 'Big',
  },
}).export()

export const Limits = types.Limits

export type Limits = typeof Limits.infer
