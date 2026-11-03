import * as z from 'zod'

export const BrandedTypes = z.object({
  userId: z.uuid().brand<'UserId'>(),
  email: z.email().brand<'Email'>(),
  price: z.number().min(0).brand<'Price'>(),
  quantity: z.int().min(0).brand<'Quantity'>(),
  tags: z.array(z.string()).min(1).max(10).brand<'Tags'>(),
  name: z.string(),
})

export type BrandedTypes = z.infer<typeof BrandedTypes>
