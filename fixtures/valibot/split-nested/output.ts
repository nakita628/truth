import * as v from 'valibot'

export const Order = v.object({
  id: v.pipe(v.number(), v.integer()),
  customer: v.object({
    name: v.string(),
    email: v.pipe(v.string(), v.email()),
    address: v.optional(v.object({ street: v.string(), city: v.string() })),
  }),
  status: v.picklist(['pending', 'shipped', 'delivered']),
})

export type OrderOutput = v.InferOutput<typeof Order>
