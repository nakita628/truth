import { Type, type Static } from 'typebox'

export const Nickname = Type.Optional(
  Type.Union([Type.String({ default: 'anonymous' }), Type.Null()]),
)

export type Nickname = Static<typeof Nickname>
