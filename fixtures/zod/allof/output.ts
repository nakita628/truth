import * as z from 'zod'

export const Combined = z.intersection(
  z.object({ name: z.string() }),
  z.object({ age: z.number() }),
)

export type Combined = z.infer<typeof Combined>
