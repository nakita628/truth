import * as z from 'zod'

export const Order = z.object({
  id: z.int(),
  customer: z.object({ name: z.string().min(1), email: z.email() }),
  items: z.array(
    z.object({ name: z.string(), price: z.number().min(0), quantity: z.int().min(1) }),
  ),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered']),
})

export type Order = z.infer<typeof Order>
