import * as z from 'zod'

export const Messaged = z.object({
  n: z
    .any()
    .refine((val) => typeof val !== 'number' || val >= 5, { error: 'low' })
    .refine((val) => typeof val !== 'number' || val <= 9, { error: 'high' })
    .exactOptional(),
  s: z
    .any()
    .refine(
      (val) =>
        (typeof val !== 'string' || val.length >= 3) && (typeof val !== 'string' || /^a/.test(val)),
      { error: 'bad' },
    )
    .exactOptional(),
})

export type Messaged = z.infer<typeof Messaged>
