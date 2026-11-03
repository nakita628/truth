import * as z from 'zod'

export const Product = z.object({
  id: z.int().meta({ description: 'The unique identifier for a product' }),
  name: z.string().meta({ description: 'Name of the product' }),
  price: z.number().gt(0),
  tags: z.array(z.string()).exactOptional(),
  dimensions: z
    .object({ length: z.number(), width: z.number(), height: z.number() })
    .exactOptional(),
  warehouseLocation: z
    .string()
    .meta({ description: 'Coordinates of the warehouse' })
    .exactOptional(),
})
