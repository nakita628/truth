import { Type, type Static } from 'typebox'

export const Pet = Type.Object({ name: Type.String() }, { ref: 'Pet', description: 'd' })

export type Pet = Static<typeof Pet>
