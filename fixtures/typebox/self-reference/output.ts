import { Type, type Static } from 'typebox'

export const Schema = Type.Cyclic(
  {
    Schema: Type.Object({ children: Type.Optional(Type.Array(Type.Ref('Schema'))) }),
  },
  'Schema',
)

export type Schema = Static<typeof Schema>
