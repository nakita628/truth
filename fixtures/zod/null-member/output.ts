import * as z from 'zod'

export const Schema = z.object({
  name: z.union([z.string(), z.null()]),
  count: z.union([z.int().min(0), z.null()]).exactOptional(),
})

export type Schema = z.infer<typeof Schema>
