import { Type, type Static } from 'typebox'

export const Sizes = Type.Object({
  count: Type.Optional(Type.Integer({ minimum: -2147483648, maximum: 2147483647 })),
  total: Type.Optional(Type.Integer({ minimum: 1, maximum: 4294967295 })),
  ratio: Type.Optional(
    Type.Number({ minimum: -3.4028234663852886e38, maximum: 3.4028234663852886e38 }),
  ),
  floor: Type.Optional(Type.Integer({ minimum: -2147483648, maximum: 2147483647 })),
})

export type Sizes = Static<typeof Sizes>
