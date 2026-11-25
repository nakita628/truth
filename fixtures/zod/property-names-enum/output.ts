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
    .refine((val) => ((re) => Object.keys(val).every((key) => re.test(key)))(new RegExp('^a')))
    .exactOptional(),
  open: z
    .looseObject({})
    .refine((val) => ((re) => Object.keys(val).every((key) => re.test(key)))(new RegExp('^a')))
    .exactOptional(),
  both: z
    .looseObject({})
    .refine(
      (val) =>
        ((re) => Object.keys(val).every((key) => re.test(key)))(new RegExp('^[a-z]+$')) &&
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
    .refine((val) =>
      ((re) => Object.keys(val).every((key) => re.test(key)))(new RegExp('^\\p{L}+$', 'u')),
    )
    .exactOptional(),
  short: z
    .looseObject({})
    .refine(
      (val) =>
        Object.keys(val).every((key) => Array.from(key).length >= 1) &&
        Object.keys(val).every((key) => Array.from(key).length <= 2),
    )
    .exactOptional(),
})

export type Schema = z.infer<typeof Schema>
