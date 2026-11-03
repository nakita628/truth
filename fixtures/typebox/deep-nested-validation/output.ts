import { Type, type Static } from 'typebox'

export const Tree = Type.Object({
  level1: Type.Object({
    level2: Type.Object({ level3: Type.Object({ value: Type.String({ minLength: 3 }) }) }),
  }),
})

export type Tree = Static<typeof Tree>
