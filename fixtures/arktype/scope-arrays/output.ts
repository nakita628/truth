import { scope } from 'arktype'

const types = scope({
  Leaf: { id: 'string' },
  Leaves: ['Leaf[]', '&', 'unknown[] <= 2'],
  Node: {
    'ids?': 'Leaf[]',
    'children?': 'Node[]',
    'pair?': ['Leaf'],
    'path?': ['Leaf', '...', 'Node[]'],
    'refList?': ['Leaves', '&', ['Leaf[]', '&', 'unknown[] >= 1']],
  },
}).export()

export const Node = types.Node

export type Node = typeof Node.infer
