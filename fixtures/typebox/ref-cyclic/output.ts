import { Type, type Static } from 'typebox'

export const Node = Type.Cyclic(
  {
    Node: Type.Object({ next: Type.Optional(Type.Ref('Node')) }),
  },
  'Node',
  { ref: 'Node' },
)

export type Node = Static<typeof Node>
