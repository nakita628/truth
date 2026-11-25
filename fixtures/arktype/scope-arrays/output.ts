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
  Label: 'string',
  Leaf: { id: 'string' },
  Leaves: ['Leaf[]', '&', 'unknown[] <= 2'],
  Node: {
    'ids?': 'Leaf[]',
    'children?': 'Node[]',
    'pair?': ['Leaf'],
    'path?': ['Leaf', '...', 'Node[]'],
    'refList?': ['Leaves', '&', ['Leaf[]', '&', 'unknown[] >= 1']],
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
  },
}).export()

export const Node = types.Node

export type Node = typeof Node.infer
