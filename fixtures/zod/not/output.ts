import * as z from 'zod'

export const NotString = z
  .any()
  .refine((val) => typeof val !== 'string', { error: 'Must not be a string' })

export type NotString = z.infer<typeof NotString>
