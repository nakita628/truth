import { Type, type Static } from 'typebox'

export const Api = Type.Cyclic(
  {
    Node: Type.Object({ children: Type.Optional(Type.Array(Type.Ref('Node'))) }),
    Tag: Type.Object({ label: Type.Optional(Type.String()) }),
    Api: Type.Object({
      name: Type.String(),
      spec: Type.Optional(
        Type.Object({
          tags: Type.Optional(Type.Array(Type.Ref('Tag'))),
          root: Type.Optional(Type.Ref('Node')),
        }),
      ),
    }),
  },
  'Api',
)

export type Api = Static<typeof Api>
