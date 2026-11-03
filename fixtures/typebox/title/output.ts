import { Type, type Static } from 'typebox'

export const User = Type.Object({ name: Type.String(), email: Type.String({ format: 'email' }) })

export type User = Static<typeof User>
