import { Type, type Static } from 'typebox'

export const Schema = Type.Object({
  pair: Type.Array(Type.String(), { minItems: 2, maxItems: 2 }),
  range: Type.Optional(Type.Array(Type.Number(), { minItems: 1, maxItems: 3 })),
})

export type Schema = Static<typeof Schema>
