import * as z from 'zod'

export const StringOrNumber = z.union([z.string(), z.number()], {
  error: 'Must be string or number',
})

export type StringOrNumber = z.infer<typeof StringOrNumber>
