import * as z from 'zod'

export const IntList = z
  .array(z.any())
  .refine((val) => {
    const Schema = z.int()
    return val.filter((item) => Schema.safeParse(item).success).length >= 2
  })
  .refine((val) => {
    const Schema = z.int()
    return val.filter((item) => Schema.safeParse(item).success).length <= 3
  })

export type IntList = z.infer<typeof IntList>
