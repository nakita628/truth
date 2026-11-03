import { Type, type Static } from 'typebox'

export const Schema = Type.Cyclic(
  {
    Node: Type.Object(
      { name: Type.String(), children: Type.Optional(Type.Array(Type.Ref('Node'))) },
      { additionalProperties: false },
    ),
    Schema: Type.Ref('Node'),
  },
  'Schema',
)
