import { Type, type Static } from 'typebox'

const C = Type.String()

const B = Type.Object({ c: Type.Optional(C) })

export const A = Type.Object({ b: Type.Optional(B) })

export type A = Static<typeof A>
