import * as z from 'zod'

export const Order = z.object({
  id: z.int(),
  customer: z.object({
    name: z.string(),
    email: z.email(),
    address: z.object({ street: z.string(), city: z.string() }).exactOptional(),
  }),
  status: z.enum(['pending', 'shipped', 'delivered']),
})

export type Order = z.infer<typeof Order>
