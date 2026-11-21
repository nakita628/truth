import * as z from 'zod'

export const Schema = z.object({
  review_target: z.union([z.string().min(1).max(96), z.null()]).exactOptional(),
  id: z
    .string()
    .nullable()
    .refine((val) => val === null || !['root'].includes(val)),
})

export type Schema = z.infer<typeof Schema>
