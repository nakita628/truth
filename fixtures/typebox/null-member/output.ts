import { Type, type Static } from 'typebox'

export const Schema = Type.Object({
  name: Type.Union([Type.String(), Type.Null()]),
  count: Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])),
})

export type Schema = Static<typeof Schema>
