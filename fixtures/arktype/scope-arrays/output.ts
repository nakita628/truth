import { scope } from 'arktype'

const types = scope({
  Leaf: { id: 'string' },
  Leaves: 'Leaf[]',
  Node: {
    'ids?': 'Leaf[]',
    'children?': 'Node[]',
    'pair?': [['Leaf', '?'], '...', 'unknown[]'],
    'path?': [['Leaf', '?'], '...', 'Node[]'],
    'closed?': [['Leaf', '?']],
    'rest?': [[['Leaf', '?'], '...', 'Node[]'], '&', 'unknown[] >= 2'],
    'refList?': 'Leaf[]',
  },
}).export()

export const Node = types.Node

export type Node = typeof Node.infer
