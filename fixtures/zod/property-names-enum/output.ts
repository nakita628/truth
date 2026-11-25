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
  bare: z
    .looseObject({})
    .refine((val) => Object.keys(val).length === 0)
    .exactOptional(),
  pattern: z
    .looseObject({})
    .refine((val) => Object.keys(val).every((key) => /^a/.test(key)))
    .exactOptional(),
  open: z
    .looseObject({})
    .refine((val) => Object.keys(val).every((key) => /^a/.test(key)))
    .exactOptional(),
  both: z
    .looseObject({})
    .refine(
      (val) =>
        Object.keys(val).every((key) => /^[a-z]+$/.test(key)) &&
        Object.keys(val).every((key) => ['a', 'B'].includes(key)),
    )
    .exactOptional(),
  closed: z
    .looseObject({})
    .refine((val) => Object.keys(val).length === 0)
    .exactOptional(),
  single: z
    .looseObject({})
    .refine((val) => Object.keys(val).every((key) => ['a'].includes(key)))
    .exactOptional(),
  letters: z
    .looseObject({})
    .refine((val) => Object.keys(val).every((key) => /^\p{L}+$/u.test(key)))
    .exactOptional(),
})

export type Schema = z.infer<typeof Schema>
