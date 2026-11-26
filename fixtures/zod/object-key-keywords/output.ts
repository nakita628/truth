import * as z from 'zod'

export const KeyChecks = z.object({
  counted: z
    .looseObject({})
    .refine((val) => Object.keys(val).length >= 2)
    .exactOptional(),
  loose: z
    .looseObject({})
    .refine((val) => Object.keys(val).length <= 1)
    .exactOptional(),
  dep: z
    .looseObject({})
    .refine((val) => !Object.hasOwn(val, 'a') || Object.hasOwn(val, 'b'))
    .exactOptional(),
  open: z.looseObject({}).exactOptional(),
  strings: z
    .looseObject({})
    .refine((val) => Object.keys(val).length >= 1)
    .refine((val) => Object.values(val).every((value) => z.string().safeParse(value).success))
    .exactOptional(),
})

export type KeyChecks = z.infer<typeof KeyChecks>
