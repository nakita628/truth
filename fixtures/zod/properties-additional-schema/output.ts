import * as z from 'zod'

export const Tagged = z
  .looseObject({ name: z.string() })
  .refine((val) =>
    Object.entries(val).every(
      ([key, value]) => !new RegExp('^x-').test(key) || z.string().safeParse(value).success,
    ),
  )
  .refine((val) =>
    Object.entries(val).every(
      ([key, value]) =>
        ['name'].includes(key) || new RegExp('^x-').test(key) || z.int().safeParse(value).success,
    ),
  )

export type Tagged = z.infer<typeof Tagged>
