import { Type, type Static } from 'typebox'

export const Pet = Type.Union([
  Type.Object({ kind: Type.Literal('dog'), bark: Type.Boolean() }),
  Type.Object({ kind: Type.Literal('cat'), purr: Type.Boolean() }),
])

export type Pet = Static<typeof Pet>
