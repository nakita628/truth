import { Type, type Static } from 'typebox'

export const A = Type.Cyclic(
  {
    B: Type.Object({ a: Type.Optional(Type.Ref('A')) }),
    A: Type.Object({ b: Type.Optional(Type.Ref('B')) }),
  },
  'A',
)

export type A = Static<typeof A>
