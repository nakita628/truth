import { Schema } from 'effect'

export const Product = Schema.Struct({
  id: Schema.Number.check(Schema.isInt()).annotate({
    description: 'The unique identifier for a product',
  }),
  name: Schema.String.annotate({ description: 'Name of the product' }),
  price: Schema.Number.check(Schema.isGreaterThan(0)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  dimensions: Schema.optional(
    Schema.Struct({ length: Schema.Number, width: Schema.Number, height: Schema.Number }),
  ),
  warehouseLocation: Schema.optional(
    Schema.String.annotate({ description: 'Coordinates of the warehouse' }),
  ),
})
