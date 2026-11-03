import { Type, type Static } from 'typebox'

const Address = Type.Object({ street: Type.String(), city: Type.String() })

export const User = Type.Object({ name: Type.String(), address: Type.Optional(Address) })

export type User = Static<typeof User>
