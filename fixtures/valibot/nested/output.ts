import * as v from 'valibot'

export const Order = v.object({
  id: v.pipe(v.number(), v.integer()),
  customer: v.object({
    name: v.pipe(v.string(), v.minCodePoints(1)),
    email: v.pipe(v.string(), v.email()),
  }),
  items: v.array(
    v.object({
      name: v.string(),
      price: v.pipe(v.number(), v.minValue(0)),
      quantity: v.pipe(v.number(), v.integer(), v.minValue(1)),
    }),
  ),
  status: v.picklist(['pending', 'confirmed', 'shipped', 'delivered']),
})

export type OrderOutput = v.InferOutput<typeof Order>
