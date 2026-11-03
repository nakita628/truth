import * as z from 'zod'

export const KeyRules = z
  .looseObject({ a: z.string() })
  .refine((val) =>
    Object.entries(val).every(
      ([key, value]) => !new RegExp('^x-').test(key) || z.string().safeParse(value).success,
    ),
  )
  .refine((val) => ['kind'].every((key) => key in val))
  .refine((val) =>
    Object.entries(val).every(
      ([key, value]) =>
        ['a'].includes(key) || new RegExp('^x-').test(key) || z.int().safeParse(value).success,
    ),
  )

export type KeyRules = z.infer<typeof KeyRules>
