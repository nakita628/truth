import { Type, type Static } from 'typebox'

export const Defaults = Type.Object({
  box: Type.Optional(Type.Object({ n: Type.Optional(Type.String()) }, { default: { n: '5' } })),
  list: Type.Optional(Type.Array(Type.String(), { default: ['5', '6'] })),
})

export type Defaults = Static<typeof Defaults>
