import { Type, type Static } from 'typebox'

export const Numbers = Type.Array(Type.Any())

export type Numbers = Static<typeof Numbers>
