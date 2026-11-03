import { Type, type Static } from 'typebox'

export const Bag = Type.Object(
  {},
  { patternProperties: { '^x_': Type.String(), '^n_': Type.Number() } },
)

export type Bag = Static<typeof Bag>
