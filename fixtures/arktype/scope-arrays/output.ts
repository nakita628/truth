import { scope } from 'arktype'

const $ = scope({
  Leaf: { id: 'string' },
  Leaves: 'Leaf[]',
  Node: {
    'ids?': 'Leaf[]',
    'children?': 'Node[]',
    'pair?': [['Leaf', '?'], '...', 'unknown[]'],
    'path?': [['Leaf', '?'], '...', 'Node[]'],
    'closed?': [['Leaf', '?']],
    'rest?': [[['Leaf', '?'], '...', 'Node[]'], '&', 'unknown[] >= 2'],
    'marked?': [
      [
        [['Leaf', '?'], '...', 'unknown[]'],
        ':',
        (data: unknown[], ctx): boolean =>
          data.some((item) => $.type('1').allows(item)) ||
          ctx.mustBe('must contain at least one matching item'),
      ],
      ':',
      (data: unknown[], ctx): boolean =>
        data.slice(1).every((item) => $.type('1').allows(item)) ||
        ctx.mustBe('an array with no unevaluated items'),
    ],
    'refList?': 'Leaf[]',
  },
})

const types = $.export()

export const Node = types.Node

export type Node = typeof Node.infer
