import * as z from 'zod'

export const Animal = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('cat'), meow: z.boolean() }),
  z.object({ kind: z.literal('dog'), bark: z.boolean() }),
])

export type Animal = z.infer<typeof Animal>
