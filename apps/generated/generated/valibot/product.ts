import * as v from 'valibot'

export const Product = v.object({
  id: v.pipe(v.pipe(v.number(), v.integer()), v.description('The unique identifier for a product')),
  name: v.pipe(v.string(), v.description('Name of the product')),
  price: v.pipe(v.number(), v.gtValue(0)),
  tags: v.optional(v.array(v.string())),
  dimensions: v.optional(v.object({ length: v.number(), width: v.number(), height: v.number() })),
  warehouseLocation: v.optional(v.pipe(v.string(), v.description('Coordinates of the warehouse'))),
})
