import { scope, type } from 'arktype'

const types = scope({
  D: { 'text?': 'string' },
  Item: {
    'detail?': [
      'D',
      '&',
      {
        'comment?': 'string',
        'id?': type('bigint | number.integer')
          .or(/^-?\d+$/)
          .pipe((data) => BigInt(data))
          .narrow(
            (data, ctx) =>
              (data >= -9223372036854775808n && data <= 9223372036854775807n) ||
              ctx.mustBe('an int64'),
          ),
      },
    ],
  },
}).export()

export const Item = types.Item

export type Item = typeof Item.infer
