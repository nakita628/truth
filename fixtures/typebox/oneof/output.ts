import { Type, type Static } from 'typebox'

export const Shape = Type.Union(
  [
    Type.Object({ kind: Type.Literal('circle'), radius: Type.Number() }),
    Type.Object({ kind: Type.Literal('rectangle'), width: Type.Number(), height: Type.Number() }),
  ],
  { errorMessage: 'Must be a valid shape' },
)

export type Shape = Static<typeof Shape>
