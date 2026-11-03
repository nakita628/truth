import { Type, type Static } from 'typebox'

export const Config = Type.Readonly(
  Type.Object({
    name: Type.String(),
    tags: Type.Readonly(Type.Array(Type.String())),
    count: Type.Optional(Type.Integer()),
  }),
)

export type Config = Static<typeof Config>
