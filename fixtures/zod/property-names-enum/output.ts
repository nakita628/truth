import * as z from 'zod'

export const Schema = z.object({
  none: z
    .looseObject({ a: z.string().exactOptional() })
    .refine((val) => Object.keys(val).length === 0)
    .exactOptional(),
  mixed: z
    .looseObject({ a: z.string().exactOptional() })
    .refine((val) => Object.keys(val).every((key) => ['a'].includes(key)))
    .exactOptional(),
  record: z
    .record(z.string(), z.string())
    .refine((val) => Object.keys(val).length === 0)
    .exactOptional(),
})

export type Schema = z.infer<typeof Schema>
