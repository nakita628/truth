import { Type, type Static } from 'typebox'

export const KeyRules = Type.Object(
  { a: Type.String(), kind: Type.Unknown() },
  { patternProperties: { '^x-': Type.String() }, unevaluatedProperties: Type.Integer() },
)

export type KeyRules = Static<typeof KeyRules>
