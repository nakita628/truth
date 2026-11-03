import * as z from 'zod'

export const PatternBag = z
  .looseObject({})
  .refine((val) =>
    Object.entries(val).every(
      ([key, value]) => !new RegExp('^S:').test(key) || z.string().safeParse(value).success,
    ),
  )
  .refine((val) =>
    Object.entries(val).every(
      ([key, value]) => !new RegExp('^I:').test(key) || z.int().safeParse(value).success,
    ),
  )

export type PatternBag = z.infer<typeof PatternBag>
