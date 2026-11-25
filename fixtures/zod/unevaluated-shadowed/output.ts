import * as z from 'zod'

export const Shadowed = z.object({
  typed: z
    .looseObject({ a: z.string().exactOptional() })
    .refine((val) =>
      Object.entries(val).every(
        ([key, value]) => ['a'].includes(key) || z.string().safeParse(value).success,
      ),
    )
    .exactOptional(),
  open: z.looseObject({ a: z.string().exactOptional() }).exactOptional(),
})

export type Shadowed = z.infer<typeof Shadowed>
