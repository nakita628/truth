import { Type, type Static } from 'typebox'

const D = Type.Object({ text: Type.Optional(Type.String()) })

export const Item = Type.Object({
  detail: Type.Optional(
    Type.Intersect([
      D,
      Type.Object({
        comment: Type.Optional(Type.String({ default: 'N/A' })),
        id: Type.Optional(Type.Integer()),
      }),
    ]),
  ),
})

export type Item = Static<typeof Item>
