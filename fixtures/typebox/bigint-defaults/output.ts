import { Type, type Static } from 'typebox'

const Big = Type.BigInt()

export const Limits = Type.Object({
  between: Type.Optional(
    Type.BigInt({ minimum: 1, exclusiveMinimum: 5, maximum: 10, exclusiveMaximum: 8 }),
  ),
  large: Type.Optional(Type.Integer({ default: 1e21 })),
  level: Type.Optional(Type.Union([Type.Literal(1e21), Type.Literal(2)])),
  big: Type.Optional(Type.Intersect([Big], { default: 5n })),
})

export type Limits = Static<typeof Limits>
