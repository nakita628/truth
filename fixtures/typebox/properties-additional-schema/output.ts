import { Type, type Static } from 'typebox'

export const Tagged = Type.Object(
  { name: Type.String() },
  { additionalProperties: Type.Integer(), patternProperties: { '^x-': Type.String() } },
)

export type Tagged = Static<typeof Tagged>
