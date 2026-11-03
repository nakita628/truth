import { Type, type Static } from 'typebox'

export const Credentials = Type.Object({
  username: Type.String(),
  password: Type.String({ minLength: 8, writeOnly: true }),
})

export type Credentials = Static<typeof Credentials>
