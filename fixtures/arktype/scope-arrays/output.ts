import { scope, type } from 'arktype'

const types = scope({
  BigIds: type(
    type(
      type('bigint | number.integer')
        .or(/^-?\d+$/)
        .pipe((data) => BigInt(data))
        .narrow(
          (data, ctx) =>
            (data >= -9223372036854775808n && data <= 9223372036854775807n) ||
            ctx.mustBe('an int64'),
        ),
    ).array(),
  ).and(type('unknown[] <= 2')),
  Codes: type(type(type('string.trim')).array()).and(type('unknown[] <= 2')),
  Label: 'string',
  Leaf: { id: 'string' },
  Leaves: ['Leaf[]', '&', 'unknown[] <= 2'],
  Node: {
    'ids?': 'Leaf[]',
    'children?': 'Node[]',
    'pair?': ['Leaf'],
    'path?': ['Leaf', '...', 'Node[]'],
    'refList?': [['Leaf[]', '&', 'unknown[] >= 1'], '|>', 'Leaves'],
    'bigIds?': [
      type(
        type(
          type('bigint | number.integer')
            .or(/^-?\d+$/)
            .pipe((data) => BigInt(data))
            .narrow(
              (data, ctx) =>
                (data >= -9223372036854775808n && data <= 9223372036854775807n) ||
                ctx.mustBe('an int64'),
            ),
        ).array(),
      ).and(type('unknown[] >= 1')),
      '|>',
      'BigIds',
    ],
    'labels?': 'Label',
    'codes?': [type(type('string.lower')).array(), '|>', 'Codes'],
  },
}).export()

export const Node = types.Node

export type Node = typeof Node.infer
