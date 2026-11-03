import { Type, type Static } from 'typebox'

export const Product = Type.Object({
  id: Type.Integer({ description: 'The unique identifier for a product' }),
  name: Type.String({ description: 'Name of the product' }),
  price: Type.Number({ exclusiveMinimum: 0 }),
  tags: Type.Optional(Type.Array(Type.String())),
  dimensions: Type.Optional(
    Type.Object({ length: Type.Number(), width: Type.Number(), height: Type.Number() }),
  ),
  warehouseLocation: Type.Optional(Type.String({ description: 'Coordinates of the warehouse' })),
})
