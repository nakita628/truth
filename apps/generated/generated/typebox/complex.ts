import { Type, type Static } from 'typebox'

export const A = Type.Cyclic(
  {
    E: Type.Object({
      label: Type.Optional(Type.String()),
      reference: Type.Optional(Type.Ref('E')),
      flags: Type.Optional(Type.Array(Type.String(), { uniqueItems: true })),
      meta: Type.Optional(Type.Record(Type.String(), Type.String())),
    }),
    D: Type.Object({
      score: Type.Optional(Type.Integer({ minimum: 0, maximum: 100, default: 50 })),
      extra: Type.Optional(Type.Union([Type.Union([Type.Null(), Type.Null()]), Type.Ref('E')])),
    }),
    B: Type.Object({
      type: Type.Literal('B'),
      name: Type.String(),
      detail: Type.Intersect([
        Type.Ref('D'),
        Type.Object({ comment: Type.Optional(Type.String({ default: 'N/A' })) }),
      ]),
    }),
    C: Type.Object({
      type: Type.Literal('C'),
      entries: Type.Array(Type.Ref('E'), { minItems: 1 }),
    }),
    A: Type.Object({
      id: Type.String({ format: 'uuid' }),
      type: Type.Union([Type.Literal('B'), Type.Literal('C')]),
      payload: Type.Union([Type.Ref('B'), Type.Ref('C')]),
    }),
  },
  'A',
)
